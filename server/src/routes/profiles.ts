import type { FastifyInstance, FastifyRequest } from 'fastify'
import { Readable } from 'node:stream'
import { z } from 'zod'
import type { AppContext } from '../context.js'
import { checkpointAfterDelete } from '../db/connection.js'
import { saltedHash } from '../lib/crypto.js'
import { profileInputSchema } from '../lib/docSchemas.js'
import { HttpError, notFound, parseInput } from '../lib/http.js'
import { ipBucket } from '../lib/ip.js'
import { createWindowLimiter } from '../lib/windowLimiter.js'
import { authOf } from '../plugins/auth.js'
import { writeAudit } from '../repo/audit.js'
import {
  getOwnedProfile,
  listProfiles,
  purgeProfile,
  softDeleteProfile,
  upsertProfile,
  type ProfileRow,
} from '../repo/profiles.js'
import { iterateAttempts, iterateDocs } from '../repo/sync.js'

const idSchema = z.string().uuid()
const deleteQuerySchema = z.object({ purge: z.enum(['true', 'false']).optional() })

/**
 * Foreign, unknown and malformed ids all produce the same 404 so ids cannot be probed.
 * Residual (L4, documented): profile uuids are chosen by the client, so creating a profile with an id that
 * already exists in another family answers 404 instead of 201. Guessing a random v4 uuid is infeasible,
 * and upserts are rate-limited per family.
 */
export function profileIdOf(request: FastifyRequest): string {
  const parsed = idSchema.safeParse((request.params as { id?: unknown }).id)
  if (!parsed.success) throw notFound()
  return parsed.data.toLowerCase()
}

export const serializeProfile = (p: ProfileRow): ProfileRow => ({ ...p })

/** Streams `{profile, docs:[...], attempts:[...]}` without building the whole document in memory. */
function* exportChunks(ctx: AppContext, profile: ProfileRow): Generator<string> {
  yield `{"profile":${JSON.stringify(profile)},"docs":[`
  let first = true
  for (const d of iterateDocs(ctx.db, profile.id)) {
    yield (first ? '' : ',') + JSON.stringify(d)
    first = false
  }
  yield '],"attempts":['
  first = true
  for (const a of iterateAttempts(ctx.db, profile.id)) {
    yield (first ? '' : ',') + JSON.stringify(a)
    first = false
  }
  yield ']}'
}

export function registerProfileRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { db } = ctx
  const auth = { auth: true }
  // L4: upserts per family per minute (creating/renaming profiles is a rare action).
  const upsertWindow = createWindowLimiter(ctx.config.rate.profile, 60_000)

  app.get('/api/profiles', { config: auth }, async (request) => ({ profiles: listProfiles(db, authOf(request).familyId).map(serializeProfile) }))

  app.put('/api/profiles/:id', { config: auth }, async (request, reply) => {
    const { familyId } = authOf(request)
    const window = upsertWindow.hit(familyId, ctx.now())
    if (!window.allowed) {
      throw new HttpError(429, 'rate_limited', undefined, { 'Retry-After': String(Math.max(1, Math.ceil(window.retryAfterMs / 1000))) })
    }
    const id = profileIdOf(request)
    const input = parseInput(profileInputSchema, request.body)
    const result = upsertProfile(db, familyId, id, input, ctx.now())
    if (result.status === 'not_found') throw notFound()
    if (result.status === 'limit') throw new HttpError(409, 'profile_limit')
    return reply.code(result.created ? 201 : 200).send({ profile: serializeProfile(result.profile) })
  })

  app.delete('/api/profiles/:id', { config: auth }, async (request) => {
    const { familyId } = authOf(request)
    const id = profileIdOf(request)
    const query = parseInput(deleteQuerySchema, request.query)
    const purge = query.purge === 'true'
    const done = purge ? purgeProfile(db, familyId, id) : softDeleteProfile(db, familyId, id, ctx.now())
    if (!done) throw notFound()
    writeAudit(db, familyId, 'delete_profile', ctx.now(), saltedHash(ctx.config.ipHashSalt, ipBucket(request.ip)))
    if (purge) checkpointAfterDelete(db)
    return { ok: true }
  })

  app.get('/api/profiles/:id/export', { config: auth }, async (request, reply) => {
    const { familyId } = authOf(request)
    const profile = getOwnedProfile(db, familyId, profileIdOf(request))
    if (!profile) throw notFound()
    void reply.header('Content-Type', 'application/json; charset=utf-8')
    void reply.header('Content-Disposition', 'attachment; filename="mates-export.json"')
    return reply.send(Readable.from(exportChunks(ctx, profile)))
  })
}
