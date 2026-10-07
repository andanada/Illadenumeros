import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify, { LogController, type FastifyBaseLogger, type FastifyInstance, type FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'
import type { Logger } from 'pino'
import { assertDatabaseWritable, checkDatabaseDirMode, type Config } from './config.js'
import type { AppContext } from './context.js'
import { openDatabase, type Db } from './db/connection.js'
import { migrate } from './db/migrate.js'
import { ipBucket } from './lib/ip.js'
import { createWindowLimiter } from './lib/windowLimiter.js'
import { createPasswordHasher } from './lib/password.js'
import { createLogger } from './logger.js'
import { registerAuthHook } from './plugins/auth.js'
import {
  registerAccessLog,
  registerCsrfGuard,
  registerErrorHandler,
  registerJsonParser,
  registerNoStore,
  registerProxySanityCheck,
} from './plugins/security.js'
import { registerAccountRoutes } from './routes/account.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerProfileRoutes } from './routes/profiles.js'
import { registerSyncRoutes } from './routes/sync.js'
import { APP_VERSION } from './version.js'

export const BODY_LIMIT_BYTES = 1024 * 1024
/** L5: wrong current passwords per family before every session of that family is closed. */
export const REAUTH_MAX_FAILURES = 5
export const REAUTH_WINDOW_MS = 15 * 60_000
/** Whole request (headers + body) must arrive within 30 s; idle sockets close after 35 s. */
export const REQUEST_TIMEOUT_MS = 30_000
export const CONNECTION_TIMEOUT_MS = 35_000
/** Longer than nginx's upstream keepalive (60 s) so the proxy, not Node, closes idle connections. */
export const KEEP_ALIVE_TIMEOUT_MS = 65_000

export interface BuildOptions {
  readonly config: Config
  /** Existing (already migrated or not) database; by default one is opened from config.databasePath. */
  readonly db?: Db
  readonly logger?: Logger
  readonly now?: () => number
}

export interface BuiltApp {
  readonly app: FastifyInstance
  readonly ctx: AppContext
}

/** Builds the Fastify instance with every security hook; does not listen. */
export async function buildApp(options: BuildOptions): Promise<BuiltApp> {
  const { config } = options
  const logger = options.logger ?? createLogger(config.logLevel)
  let db = options.db
  if (!db) {
    assertDatabaseWritable(config.databasePath)
    checkDatabaseDirMode(config.databasePath, { production: config.env === 'production', warn: (m) => logger.warn(m) })
    db = openDatabase(config.databasePath)
  }
  migrate(db)
  const ctx: AppContext = {
    config,
    db,
    hasher: createPasswordHasher(config.argon2),
    now: options.now ?? Date.now,
    reauthFailures: createWindowLimiter(REAUTH_MAX_FAILURES, REAUTH_WINDOW_MS),
  }

  const app = Fastify({
    loggerInstance: logger as FastifyBaseLogger,
    // Our own access log (registerAccessLog) replaces Fastify's request logging.
    logController: new LogController({ disableRequestLogging: true }),
    bodyLimit: BODY_LIMIT_BYTES,
    requestTimeout: REQUEST_TIMEOUT_MS,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    keepAliveTimeout: KEEP_ALIVE_TIMEOUT_MS,
    // Only the local nginx may set X-Forwarded-For (TRUST_PROXY: loopback by default, the Docker bridge in compose).
    trustProxy: [...config.trustProxy],
    genReqId: () => randomUUID(),
  })

  app.decorateRequest('auth', null)
  registerJsonParser(app)
  registerErrorHandler(app)
  registerNoStore(app)
  registerAccessLog(app)

  await app.register(helmet, {
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  })
  // After helmet (L7): helmet sets its headers in its own onRequest hook, which must run before a CSRF rejection.
  registerCsrfGuard(app)
  registerProxySanityCheck(app, config.trustProxy)
  await app.register(cookie)
  // onRequest: limits apply before authentication, so unauthenticated floods are throttled too.
  // Keys are IP buckets (M3: IPv6 grouped by /64). The login limiter keys on IP + email in the handler.
  await app.register(rateLimit, {
    global: true,
    max: config.rate.global,
    timeWindow: '1 minute',
    keyGenerator: (request: FastifyRequest) => `ip:${ipBucket(request.ip)}`,
  })
  registerAuthHook(app, ctx)
  app.setNotFoundHandler({ preHandler: app.rateLimit() }, (_request, reply) => reply.code(404).send({ error: 'not_found' }))

  app.get('/api/health', { config: { rateLimit: false } }, async () => ({ ok: true, version: APP_VERSION }))
  registerAuthRoutes(app, ctx)
  registerProfileRoutes(app, ctx)
  registerSyncRoutes(app, ctx)
  registerAccountRoutes(app, ctx)

  await app.ready()
  return { app, ctx }
}
