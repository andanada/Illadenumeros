import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { AppContext } from '../context.js'
import { checkpointAfterDelete } from '../db/connection.js'
import { saltedHash } from '../lib/crypto.js'
import { HttpError, parseInput } from '../lib/http.js'
import { ipBucket } from '../lib/ip.js'
import { authOf, clearSessionCookie, verifyReauth } from '../plugins/auth.js'
import { unlinkAuditFamily, writeAudit } from '../repo/audit.js'
import { deleteFamily, findFamilyById } from '../repo/families.js'
import { listProfilesForExport } from '../repo/profiles.js'
import { countProfileData } from '../repo/sync.js'

const deleteSchema = z.object({ password: z.string().min(1).max(128) })

export function registerAccountRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { db } = ctx
  const limit = { rateLimit: { max: ctx.config.rate.auth, timeWindow: '1 minute' } }

  app.get('/api/account/export', { config: { auth: true } }, async (request) => {
    const { familyId } = authOf(request)
    const family = findFamilyById(db, familyId)
    if (!family) throw new HttpError(401, 'unauthorized')
    // Soft-deleted profiles are still stored until purged, so they are part of the export (marked with deletedAt).
    const profiles = listProfilesForExport(db, familyId).map((p) => ({
      ...p,
      counts: countProfileData(db, p.id),
      ...(p.deletedAt === null ? { exportUrl: `/api/profiles/${p.id}/export` } : {}),
    }))
    return {
      exportedAt: ctx.now(),
      family: { id: family.id, email: family.email, createdAt: family.createdAt, lastLoginAt: family.lastLoginAt },
      profiles,
    }
  })

  app.delete('/api/account', { config: { ...limit, auth: true } }, async (request, reply) => {
    const { familyId } = authOf(request)
    const body = parseInput(deleteSchema, request.body)
    const family = findFamilyById(db, familyId)
    if (!family) throw new HttpError(401, 'unauthorized')
    await verifyReauth(ctx, reply, familyId, family.passwordHash, body.password)
    // One transaction; sessions, profiles, docs and attempts cascade (indexed on profile_id, fast even with many attempts).
    // L1: remaining audit rows are unlinked from the family, and the deletion event itself carries no family id.
    db.transaction(() => {
      deleteFamily(db, familyId)
      unlinkAuditFamily(db, familyId)
      writeAudit(db, null, 'delete_account', ctx.now(), saltedHash(ctx.config.ipHashSalt, ipBucket(request.ip)))
    })()
    checkpointAfterDelete(db)
    clearSessionCookie(ctx, reply)
    return { ok: true }
  })
}
