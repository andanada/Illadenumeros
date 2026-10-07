import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { AppContext } from '../context.js'
import { syncBodySchema, validateAttemptData, validateDoc, type SyncBody, type ValidDoc } from '../lib/docSchemas.js'
import { HttpError, MAX_REPORTED_ISSUES, notFound, parseInput, type Issue } from '../lib/http.js'
import { ipBucket } from '../lib/ip.js'
import { createWindowLimiter } from '../lib/windowLimiter.js'
import { authOf } from '../plugins/auth.js'
import { getOwnedProfile } from '../repo/profiles.js'
import { SyncAbort, syncProfile, type PushedAttempt, type SyncResult } from '../repo/sync.js'
import { profileIdOf } from './profiles.js'

interface ValidatedPush {
  readonly docs: readonly ValidDoc[]
  readonly attempts: readonly PushedAttempt[]
}

/** Validates every pushed item; also rejects duplicated (kind,key) pairs (H1: no repeated merges in one push). */
function validatePush(push: SyncBody['push']): ValidatedPush {
  const issues: Issue[] = []
  const report = (issue: Issue): void => {
    if (issues.length < MAX_REPORTED_ISSUES) issues.push(issue)
  }
  const seen = new Set<string>()
  const docs = push.docs.flatMap((raw, index): ValidDoc[] => {
    const pair = `${raw.kind}\u0000${raw.key}`
    if (seen.has(pair)) {
      report({ path: `push.docs.${index}`, code: `${raw.kind}: duplicate key in push` })
      return []
    }
    seen.add(pair)
    const res = validateDoc(raw)
    if (res.ok) return [res.doc]
    report({ path: `push.docs.${index}`, code: res.error })
    return []
  })
  const attempts = push.attempts.flatMap((raw, index): PushedAttempt[] => {
    const data = validateAttemptData(raw.data)
    if (data) return [{ id: raw.id, data, createdAt: raw.createdAt }]
    report({ path: `push.attempts.${index}`, code: 'invalid_attempt' })
    return []
  })
  if (issues.length > 0) throw new HttpError(422, 'validation_failed', issues)
  return { docs, attempts }
}

function toHttpError(error: SyncAbort): HttpError {
  if (error.reason === 'quota_exceeded') return new HttpError(409, 'quota_exceeded')
  return new HttpError(422, 'validation_failed', [{ path: `push.docs.${error.index}`, code: error.detail }])
}

/*
 * Work per push is bounded: <= 500 unique docs (each <= 8 KB, rewards <= 64 KB also after merging),
 * <= 1000 attempts, 1 MB body, and per-family + per-IP request rates.
 */
export function registerSyncRoutes(app: FastifyInstance, ctx: AppContext): void {
  // M2: the route limit keys on the client address bucket, never on the (unvalidated) cookie.
  const keyGenerator = (request: FastifyRequest): string => `ip:${ipBucket(request.ip)}`
  // ...and every family has its own budget, shared by all of its sessions.
  const familyWindow = createWindowLimiter(ctx.config.rate.sync, 60_000)

  app.post(
    '/api/profiles/:id/sync',
    { config: { auth: true, rateLimit: { max: ctx.config.rate.global, timeWindow: '1 minute', keyGenerator } } },
    async (request): Promise<SyncResult> => {
      const { familyId } = authOf(request)
      const window = familyWindow.hit(familyId, ctx.now())
      if (!window.allowed) {
        throw new HttpError(429, 'rate_limited', undefined, { 'Retry-After': String(Math.max(1, Math.ceil(window.retryAfterMs / 1000))) })
      }
      const profile = getOwnedProfile(ctx.db, familyId, profileIdOf(request))
      if (!profile) throw notFound()
      const body = parseInput(syncBodySchema, request.body)
      const { docs, attempts } = validatePush(body.push)
      try {
        return syncProfile(ctx.db, profile.id, body.since, docs, attempts, ctx.config.quota)
      } catch (error) {
        if (error instanceof SyncAbort) throw toHttpError(error)
        throw error
      }
    },
  )
}
