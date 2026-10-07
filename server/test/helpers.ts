import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import { randomUUID } from 'node:crypto'
import { buildApp, type BuiltApp } from '../src/app.js'
import { loadConfig, type Config } from '../src/config.js'
import { openDatabase } from '../src/db/connection.js'
import { createLogger } from '../src/logger.js'

export const INVITE = 'test-invite-code'
export const PASSWORD = 'correct horse battery'

export interface TestClock {
  now: number
}

export interface TestApp extends BuiltApp {
  readonly clock: TestClock
  readonly config: Config
}

/** Fast argon2 parameters and generous limits by default; individual tests override through `env`. */
export async function makeApp(env: Record<string, string> = {}): Promise<TestApp> {
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_PATH: ':memory:',
    IP_HASH_SALT: 'x'.repeat(40),
    REGISTRATION_CODE: INVITE,
    ARGON2_MEMORY_KIB: '8192',
    ARGON2_TIME_COST: '1',
    LOG_LEVEL: 'silent',
    RATE_LIMIT_GLOBAL: '100000',
    RATE_LIMIT_AUTH: '100000',
    RATE_LIMIT_LOGIN: '100000',
    RATE_LIMIT_SYNC: '100000',
    ...env,
  })
  const clock: TestClock = { now: 1_700_000_000_000 }
  const built = await buildApp({ config, db: openDatabase(':memory:'), logger: createLogger('silent'), now: () => clock.now })
  return { ...built, clock, config }
}

const HEADERS = { 'x-requested-with': 'mm', 'content-type': 'application/json' }

export interface Client {
  readonly cookie: () => string | undefined
  request(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown, headers?: Record<string, string>): Promise<LightMyRequestResponse>
}

/** Minimal cookie-jar client over fastify.inject. */
export function client(app: FastifyInstance, ip = '10.0.0.1'): Client {
  let jar: string | undefined
  return {
    cookie: () => jar,
    async request(method, url, body, headers = {}) {
      const res = await app.inject({
        method,
        url,
        remoteAddress: ip,
        headers: { ...HEADERS, ...(jar ? { cookie: jar } : {}), ...headers },
        ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
      })
      const set = res.cookies.find((c) => c.name.endsWith('mm_session'))
      if (set) jar = set.value === '' ? undefined : `${set.name}=${set.value}`
      return res
    },
  }
}

let counter = 0
export async function registerFamily(app: FastifyInstance, email?: string, ip?: string): Promise<{ http: Client; email: string }> {
  counter += 1
  const address = email ?? `family${counter}@example.com`
  const http = client(app, ip)
  const res = await http.request('POST', '/api/auth/register', { email: address, password: PASSWORD, inviteCode: INVITE })
  if (res.statusCode !== 201) throw new Error(`register failed: ${res.statusCode}`)
  return { http, email: address }
}

export const profileBody = (name = 'Nyx') => ({ name, character: 'nyx', color: 'lila', createdAt: 1_700_000_000_000 })

export async function createProfile(http: Client, name = 'Nyx'): Promise<string> {
  const id = randomUUID()
  const res = await http.request('PUT', `/api/profiles/${id}`, profileBody(name))
  if (res.statusCode !== 201) throw new Error(`profile failed: ${res.statusCode}`)
  return id
}

export const skillDoc = (skillId: string, o: Record<string, unknown> = {}, updatedAt = 1000) => ({
  kind: 'skill',
  key: skillId,
  updatedAt,
  data: {
    skillId,
    accuracy: 0.5,
    fluency: 0,
    mastery: 0.5,
    status: 'aprenent',
    cpaStage: 'concret',
    attempts: 1,
    correct: 1,
    sessions: ['s1'],
    recent: [true],
    consecutiveErrors: 0,
    ...o,
  },
})

export const attemptPush = (id: string = randomUUID(), createdAt = 1000) => ({
  id,
  createdAt,
  data: {
    ambitId: 'mates',
    skillId: 'A4',
    factKey: 'add:3+5',
    correct: true,
    rtMs: 1200,
    hintsUsed: 0,
    cpaStage: 'concret',
    gameId: 'bombolles',
    sessionId: 's1',
    createdAt,
  },
})

/** Valid, distinct skill ids (client format /^[A-Z]\d{1,2}$/): A0..A99, B0..B99, ... */
export const skillIdAt = (i: number): string => `${String.fromCharCode(65 + Math.floor(i / 100))}${i % 100}`

/** Valid ISO day `n` days after 2000-01-01. */
export const isoDayAt = (n: number): string => new Date(Date.UTC(2000, 0, 1) + n * 86_400_000).toISOString().slice(0, 10)
