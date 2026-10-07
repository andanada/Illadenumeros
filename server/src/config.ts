import { randomBytes } from 'node:crypto'
import { accessSync, constants, mkdirSync, statSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'

const boolFromEnv = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1')

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  DATABASE_PATH: z.string().min(1).default('./data/mates.db'),
  IP_HASH_SALT: z.string().optional(),
  REGISTRATION_CODE: z.string().optional(),
  SESSION_COOKIE_SECURE: boolFromEnv.default('true'),
  TRUST_PROXY: z.string().default('127.0.0.1,::1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  ARGON2_MEMORY_KIB: z.coerce.number().int().min(8192).max(1_048_576).default(19456),
  ARGON2_TIME_COST: z.coerce.number().int().min(1).max(10).default(2),
  ARGON2_PARALLELISM: z.coerce.number().int().min(1).max(16).default(1),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  SESSION_MAX_DAYS: z.coerce.number().int().min(1).max(730).default(90),
  LOGIN_MAX_FAILURES: z.coerce.number().int().min(1).max(100).default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  RATE_LIMIT_GLOBAL: z.coerce.number().int().min(1).default(120),
  RATE_LIMIT_AUTH: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_LOGIN: z.coerce.number().int().min(1).default(5),
  RATE_LIMIT_SYNC: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_PROFILE: z.coerce.number().int().min(1).default(30),
  LOGIN_EMAIL_MAX_FAILURES: z.coerce.number().int().min(1).max(10_000).default(30),
  QUOTA_DOCS_PER_PROFILE: z.coerce.number().int().min(1).default(2000),
  QUOTA_ATTEMPTS_PER_PROFILE: z.coerce.number().int().min(1).default(200_000),
  PURGE_AFTER_DAYS: z.coerce.number().int().min(0).default(30),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().min(1).default(90),
})

export interface Config {
  readonly env: 'development' | 'test' | 'production'
  readonly host: string
  readonly port: number
  readonly databasePath: string
  readonly ipHashSalt: string
  readonly registrationCode: string | null
  readonly cookieSecure: boolean
  readonly trustProxy: readonly string[]
  readonly logLevel: string
  readonly argon2: { readonly memoryCost: number; readonly timeCost: number; readonly parallelism: number }
  readonly sessionTtlMs: number
  readonly sessionMaxMs: number
  readonly loginMaxFailures: number
  readonly loginLockoutMs: number
  readonly rate: { readonly global: number; readonly auth: number; readonly login: number; readonly sync: number; readonly profile: number }
  /** Failed logins per normalised email per hour, from any IP (slows only; never a permanent lock). */
  readonly loginEmailMaxFailures: number
  readonly quota: { readonly docsPerProfile: number; readonly attemptsPerProfile: number }
  readonly purgeAfterMs: number
  readonly auditRetentionMs: number
}

const DAY_MS = 86_400_000
export const MIN_SALT_LENGTH = 32
export const MIN_REGISTRATION_CODE_LENGTH = 20

export class ConfigError extends Error {}

/** Parses and validates the environment. Never echoes secret values in errors. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const keys = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new ConfigError(`Invalid environment variables: ${keys}`)
  }
  const e = parsed.data
  const production = e.NODE_ENV === 'production'
  const rawSalt = e.IP_HASH_SALT ?? ''
  if (production && rawSalt.length < MIN_SALT_LENGTH) {
    throw new ConfigError(`IP_HASH_SALT must be set and have at least ${MIN_SALT_LENGTH} characters in production`)
  }
  if (production && !e.SESSION_COOKIE_SECURE) {
    throw new ConfigError('SESSION_COOKIE_SECURE must be true in production')
  }
  if (rawSalt !== '' && rawSalt.length < MIN_SALT_LENGTH) {
    throw new ConfigError(`IP_HASH_SALT must have at least ${MIN_SALT_LENGTH} characters`)
  }
  const code = e.REGISTRATION_CODE
  if (production && code !== undefined && code !== '' && code.length < MIN_REGISTRATION_CODE_LENGTH) {
    throw new ConfigError(`REGISTRATION_CODE must have at least ${MIN_REGISTRATION_CODE_LENGTH} characters in production (openssl rand -base64 24)`)
  }
  return Object.freeze({
    env: e.NODE_ENV,
    host: e.HOST,
    port: e.PORT,
    databasePath: e.DATABASE_PATH,
    // Outside production an ephemeral salt is fine (hashes only need to be stable within a process).
    ipHashSalt: rawSalt !== '' ? rawSalt : randomBytes(32).toString('hex'),
    registrationCode: code !== undefined && code !== '' ? code : null,
    cookieSecure: e.SESSION_COOKIE_SECURE,
    trustProxy: Object.freeze(
      e.TRUST_PROXY.split(',')
        .map((v) => v.trim())
        .filter((v) => v !== ''),
    ),
    logLevel: e.LOG_LEVEL,
    argon2: Object.freeze({
      memoryCost: e.ARGON2_MEMORY_KIB,
      timeCost: e.ARGON2_TIME_COST,
      parallelism: e.ARGON2_PARALLELISM,
    }),
    sessionTtlMs: e.SESSION_TTL_DAYS * DAY_MS,
    sessionMaxMs: e.SESSION_MAX_DAYS * DAY_MS,
    loginMaxFailures: e.LOGIN_MAX_FAILURES,
    loginLockoutMs: e.LOGIN_LOCKOUT_MINUTES * 60_000,
    rate: Object.freeze({
      global: e.RATE_LIMIT_GLOBAL,
      auth: e.RATE_LIMIT_AUTH,
      login: e.RATE_LIMIT_LOGIN,
      sync: e.RATE_LIMIT_SYNC,
      profile: e.RATE_LIMIT_PROFILE,
    }),
    loginEmailMaxFailures: e.LOGIN_EMAIL_MAX_FAILURES,
    quota: Object.freeze({ docsPerProfile: e.QUOTA_DOCS_PER_PROFILE, attemptsPerProfile: e.QUOTA_ATTEMPTS_PER_PROFILE }),
    purgeAfterMs: e.PURGE_AFTER_DAYS * DAY_MS,
    auditRetentionMs: e.AUDIT_RETENTION_DAYS * DAY_MS,
  })
}

/** Boot-time check: the database directory must exist (or be creatable) and be writable. */
export function assertDatabaseWritable(path: string): void {
  if (path === ':memory:') return
  const dir = dirname(path)
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
    accessSync(dir, constants.W_OK)
  } catch {
    throw new ConfigError('DATABASE_PATH directory is not writable')
  }
}

export type DirModeVerdict = 'ok' | 'insecure' | 'skip'

/** M4: on POSIX the database directory must not be reachable by group/others. Windows has no mode bits. */
export function assessDirMode(mode: number, platform: NodeJS.Platform): DirModeVerdict {
  if (platform === 'win32') return 'skip'
  return (mode & 0o077) === 0 ? 'ok' : 'insecure'
}

export interface DirModeCheckOptions {
  readonly production: boolean
  readonly warn: (message: string) => void
  readonly platform?: NodeJS.Platform
}

/** Boot check: WARN outside production, refuse to start in production when the DB directory is group/world accessible. */
export function checkDatabaseDirMode(path: string, options: DirModeCheckOptions): void {
  if (path === ':memory:') return
  const verdict = assessDirMode(statSync(dirname(path)).mode, options.platform ?? process.platform)
  if (verdict !== 'insecure') return
  const message = 'DATABASE_PATH directory is accessible by group/others (chmod 700 it)'
  if (options.production) throw new ConfigError(message)
  options.warn(message)
}
