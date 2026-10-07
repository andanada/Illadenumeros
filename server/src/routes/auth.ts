import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { AppContext } from '../context.js'
import { newId, safeEqual, saltedHash } from '../lib/crypto.js'
import { HttpError, parseInput } from '../lib/http.js'
import { ipBucket } from '../lib/ip.js'
import { isWeakPassword } from '../lib/passwordPolicy.js'
import { createWindowLimiter } from '../lib/windowLimiter.js'
import { authOf, clearSessionCookie, sessionToken, setSessionCookie, verifyReauth } from '../plugins/auth.js'
import { clearLoginFailures, lockoutRemaining, recordLoginFailure, writeAudit, type AuditEvent } from '../repo/audit.js'
import { findFamilyByEmail, findFamilyById, insertFamily, touchLogin, updatePasswordHash } from '../repo/families.js'
import { listProfiles } from '../repo/profiles.js'
import { createSession, deleteOtherSessions, deleteSession, resolveSession } from '../repo/sessions.js'

const email = z.string().trim().toLowerCase().email().max(254)
/** M3: >= 10 chars, not a well-known password, not one repeated character, not a digit sequence. */
const newPassword = z.string().min(10).max(128).refine((p) => !isWeakPassword(p), { message: 'weak_password' })
const anyPassword = z.string().min(1).max(128)

const registerSchema = z.object({ email, password: newPassword, inviteCode: z.string().min(1).max(256) })
const loginSchema = z.object({ email, password: anyPassword })
const changePasswordSchema = z.object({ current: anyPassword, new: newPassword })

const HOUR_MS = 3_600_000
const retryAfter = (ms: number): Record<string, string> => ({ 'Retry-After': String(Math.max(1, Math.ceil(ms / 1000))) })

export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { config, db, hasher } = ctx
  const policy = { ttlMs: config.sessionTtlMs, maxMs: config.sessionMaxMs }
  // M3: every IP-derived key uses the bucket (IPv4, or the IPv6 /64).
  const ipHash = (request: FastifyRequest): string => saltedHash(config.ipHashSalt, ipBucket(request.ip))
  const audit = (request: FastifyRequest, familyId: string | null, event: AuditEvent): void =>
    writeAudit(db, familyId, event, ctx.now(), ipHash(request))
  const authLimit = { rateLimit: { max: config.rate.auth, timeWindow: '1 minute' } }

  function startSession(request: FastifyRequest, reply: FastifyReply, familyId: string): void {
    const previous = sessionToken(ctx, request)
    if (previous) {
      const old = resolveSession(db, previous, policy, ctx.now())
      if (old) deleteSession(db, old.id)
    }
    const { token, expiresAt } = createSession(db, familyId, policy, ctx.now())
    setSessionCookie(ctx, reply, token, expiresAt)
  }

  app.post('/api/auth/register', { config: authLimit }, async (request, reply) => {
    const body = parseInput(registerSchema, request.body)
    if (config.registrationCode === null) throw new HttpError(403, 'registration_closed')
    if (!safeEqual(body.inviteCode, config.registrationCode)) throw new HttpError(403, 'invalid_invite')
    const passwordHash = await hasher.hash(body.password)
    const id = newId()
    // Residual: an invite-code holder can learn that an email is registered (409). Accepted (see README).
    if (!insertFamily(db, { id, email: body.email, passwordHash, now: ctx.now() })) throw new HttpError(409, 'email_taken')
    startSession(request, reply, id)
    audit(request, id, 'register')
    return reply.code(201).send({ family: { id, email: body.email }, profiles: [] })
  })

  const loginWindow = createWindowLimiter(config.rate.login, 60_000)
  // M3: failures per email from ANY address. Only slows (429 + Retry-After for at most an hour); never locks for good.
  const emailFailures = createWindowLimiter(config.loginEmailMaxFailures, HOUR_MS)

  app.post('/api/auth/login', { config: authLimit }, async (request, reply) => {
    const body = parseInput(loginSchema, request.body)
    const bucket = ipBucket(request.ip)
    const throttleKey = saltedHash(config.ipHashSalt, `${bucket}|${body.email}`)
    const emailKey = saltedHash(config.ipHashSalt, `email|${body.email}`)
    // 5/min per IP bucket + email (in memory), on top of the persistent lockout below.
    const window = loginWindow.hit(throttleKey, ctx.now())
    if (!window.allowed) throw new HttpError(429, 'rate_limited', undefined, retryAfter(window.retryAfterMs))
    const remaining = lockoutRemaining(db, throttleKey, ctx.now())
    if (remaining > 0) throw new HttpError(429, 'too_many_attempts', undefined, retryAfter(remaining))
    const perEmail = emailFailures.check(emailKey, ctx.now())
    if (!perEmail.allowed) throw new HttpError(429, 'too_many_attempts', undefined, retryAfter(perEmail.retryAfterMs))
    const family = findFamilyByEmail(db, body.email)
    // Always runs a full argon2 verification, even for unknown emails.
    const ok = await hasher.verify(family?.passwordHash ?? null, body.password)
    if (!family || !ok) {
      recordLoginFailure(db, throttleKey, { maxFailures: config.loginMaxFailures, lockoutMs: config.loginLockoutMs }, ctx.now())
      emailFailures.record(emailKey, ctx.now())
      audit(request, null, 'login_failed')
      throw new HttpError(401, 'invalid_credentials')
    }
    clearLoginFailures(db, throttleKey)
    touchLogin(db, family.id, ctx.now())
    startSession(request, reply, family.id)
    audit(request, family.id, 'login')
    return { family: { id: family.id, email: family.email }, profiles: listProfiles(db, family.id) }
  })

  app.post('/api/auth/logout', { config: authLimit }, async (request, reply) => {
    const token = sessionToken(ctx, request)
    const session = token ? resolveSession(db, token, policy, ctx.now()) : null
    if (session) {
      deleteSession(db, session.id)
      audit(request, session.familyId, 'logout')
    }
    clearSessionCookie(ctx, reply)
    return { ok: true }
  })

  app.get('/api/auth/me', { config: { auth: true } }, async (request) => {
    const { familyId } = authOf(request)
    const family = findFamilyById(db, familyId)
    if (!family) throw new HttpError(401, 'unauthorized')
    return { family: { id: family.id, email: family.email }, profiles: listProfiles(db, familyId) }
  })

  app.post('/api/auth/change-password', { config: { ...authLimit, auth: true } }, async (request, reply) => {
    const { familyId, sessionId } = authOf(request)
    const body = parseInput(changePasswordSchema, request.body)
    const family = findFamilyById(db, familyId)
    if (!family) throw new HttpError(401, 'unauthorized')
    await verifyReauth(ctx, reply, familyId, family.passwordHash, body.current)
    updatePasswordHash(db, familyId, await hasher.hash(body.new))
    deleteOtherSessions(db, familyId, sessionId)
    audit(request, familyId, 'change_password')
    return { ok: true }
  })
}
