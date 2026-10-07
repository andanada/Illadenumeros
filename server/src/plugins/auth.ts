import type { FastifyInstance, FastifyReply, FastifyRequest, onRequestHookHandler } from 'fastify'
import type { AppContext } from '../context.js'
import { HttpError } from '../lib/http.js'
import { deleteFamilySessions, resolveSession } from '../repo/sessions.js'

export interface AuthInfo {
  readonly familyId: string
  readonly sessionId: string
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthInfo | null
  }
  interface FastifyContextConfig {
    /** Route needs a session: authenticated in onRequest, right after the rate limiter (see registerAuthHook). */
    auth?: boolean
  }
}

export const cookieName = (ctx: AppContext): string => (ctx.config.cookieSecure ? '__Host-mm_session' : 'mm_session')

export function setSessionCookie(ctx: AppContext, reply: FastifyReply, token: string, expiresAt: number): void {
  void reply.setCookie(cookieName(ctx), token, {
    httpOnly: true,
    secure: ctx.config.cookieSecure,
    sameSite: 'strict',
    path: '/',
    maxAge: Math.max(0, Math.floor((expiresAt - ctx.now()) / 1000)),
  })
}

export function clearSessionCookie(ctx: AppContext, reply: FastifyReply): void {
  void reply.clearCookie(cookieName(ctx), { httpOnly: true, secure: ctx.config.cookieSecure, sameSite: 'strict', path: '/' })
}

/** Raw cookie value, if any (also used to key the per-session rate limit). */
export const sessionToken = (ctx: AppContext, request: FastifyRequest): string | undefined => request.cookies[cookieName(ctx)] || undefined

/**
 * Builds the hook that authenticates the request or answers 401. Routes register it as `onRequest` (M2),
 * so unauthenticated requests are rejected before their body is read or parsed.
 */
export function requireAuth(ctx: AppContext) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const token = sessionToken(ctx, request)
    const session = token
      ? resolveSession(ctx.db, token, { ttlMs: ctx.config.sessionTtlMs, maxMs: ctx.config.sessionMaxMs }, ctx.now())
      : null
    if (!token || !session) {
      clearSessionCookie(ctx, reply)
      throw new HttpError(401, 'unauthorized')
    }
    request.auth = { familyId: session.familyId, sessionId: session.id }
    if (session.refreshed) setSessionCookie(ctx, reply, token, session.expiresAt)
  }
}

/**
 * L5: verifies the current password of an authenticated family. Every failure is counted per family; at the
 * limit (5 in 15 min) all sessions of the family are closed (a stolen session cannot keep guessing) and 401 is returned.
 */
export async function verifyReauth(ctx: AppContext, reply: FastifyReply, familyId: string, passwordHash: string, password: string): Promise<void> {
  if (await ctx.hasher.verify(passwordHash, password)) return
  ctx.reauthFailures.record(familyId, ctx.now())
  if (ctx.reauthFailures.check(familyId, ctx.now()).allowed) throw new HttpError(403, 'invalid_credentials')
  ctx.reauthFailures.reset(familyId)
  deleteFamilySessions(ctx.db, familyId)
  clearSessionCookie(ctx, reply)
  throw new HttpError(401, 'unauthorized')
}

/**
 * M2: routes with `config.auth` get the authentication hook appended to their onRequest chain. Registered
 * AFTER @fastify/rate-limit, whose own onRoute hook appends the limiter first, so the order is always
 * [rate limit, auth]: floods are counted, and bodies of unauthenticated requests are never parsed.
 */
export function registerAuthHook(app: FastifyInstance, ctx: AppContext): void {
  const authenticate = requireAuth(ctx) as onRequestHookHandler
  app.addHook('onRoute', (route) => {
    if (route.config?.auth !== true) return
    const existing = route.onRequest === undefined ? [] : Array.isArray(route.onRequest) ? route.onRequest : [route.onRequest]
    route.onRequest = [...existing, authenticate]
  })
}

/** Handler-side accessor: after requireAuth the info is always present. */
export function authOf(request: FastifyRequest): AuthInfo {
  if (!request.auth) throw new HttpError(401, 'unauthorized')
  return request.auth
}
