import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import sjson from 'secure-json-parse'
import { HttpError } from '../lib/http.js'
import { compileTrustList } from '../lib/ip.js'

const SAFE_METHODS = new Set(['GET', 'HEAD'])

/**
 * CSRF defence in depth on top of SameSite=Strict: every state-changing request must carry
 * `X-Requested-With: mm` and `Content-Type: application/json` (a cross-site form or simple fetch cannot).
 */
export function registerCsrfGuard(app: FastifyInstance): void {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    if (SAFE_METHODS.has(request.method)) return
    const contentType = (request.headers['content-type'] ?? '').split(';')[0]?.trim().toLowerCase()
    if (request.headers['x-requested-with'] !== 'mm' || contentType !== 'application/json') {
      throw new HttpError(403, 'csrf_rejected')
    }
  })
}

/**
 * Only JSON is accepted. An empty body is allowed (logout, delete) and parsed as undefined.
 * secure-json-parse rejects `__proto__` / `constructor.prototype` keys (prototype poisoning) as invalid JSON.
 */
export function registerJsonParser(app: FastifyInstance): void {
  app.removeAllContentTypeParsers()
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    const text = typeof body === 'string' ? body : body.toString('utf8')
    if (text.length === 0) return done(null, undefined)
    try {
      done(null, sjson.parse(text, undefined, { protoAction: 'error', constructorAction: 'error' }) as unknown)
    } catch {
      done(new HttpError(400, 'invalid_json'), undefined)
    }
  })
}

export function registerNoStore(app: FastifyInstance): void {
  app.addHook('onSend', async (_request: FastifyRequest, reply: FastifyReply, payload) => {
    void reply.header('Cache-Control', 'no-store')
    return payload
  })
}

/** Maps every error to `{error, ...}`. Unknown errors become a generic 500 and are logged without user content. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | HttpError, request, reply) => {
    if (error instanceof HttpError) {
      for (const [name, value] of Object.entries(error.headers ?? {})) void reply.header(name, value)
      return reply.code(error.statusCode).send({ error: error.code, ...(error.issues ? { issues: error.issues } : {}) })
    }
    const status = typeof error.statusCode === 'number' ? error.statusCode : 500
    if (status === 429) return reply.code(429).send({ error: 'rate_limited' })
    if (status === 413) return reply.code(413).send({ error: 'payload_too_large' })
    if (status === 415) return reply.code(415).send({ error: 'unsupported_media_type' })
    if (status >= 400 && status < 500) return reply.code(status).send({ error: 'bad_request' })
    request.log.error({ errCode: error.code, errName: error.name }, 'unhandled error')
    return reply.code(500).send({ error: 'internal_error' })
  })
}

/**
 * L2: a request whose socket peer is a trusted proxy but that carries no X-Forwarded-For would make every
 * client share the proxy's rate-limit bucket. Warn once so a broken nginx/compose setup is noticed.
 */
export function registerProxySanityCheck(app: FastifyInstance, trustProxy: readonly string[]): void {
  const isTrusted = compileTrustList(trustProxy)
  let warned = false
  app.addHook('onRequest', async (request) => {
    if (warned || request.headers['x-forwarded-for'] !== undefined) return
    if (!isTrusted(request.socket.remoteAddress ?? '')) return
    warned = true
    request.log.warn('request from a trusted proxy without X-Forwarded-For: clients share one rate-limit bucket')
  })
}

/** One log line per request: method, route template, status, latency, request id. Nothing else. */
export function registerAccessLog(app: FastifyInstance): void {
  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url ?? 'unmatched',
        status: reply.statusCode,
        latencyMs: Math.round(reply.elapsedTime),
        reqId: request.id,
      },
      'request',
    )
  })
}
