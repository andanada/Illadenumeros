import { hash, verify, type Algorithm } from '@node-rs/argon2'
import { randomBytes } from 'node:crypto'
import type { Config } from '../config.js'
import { HttpError } from './http.js'

/** Argon2id (algorithm id 2 in @node-rs/argon2; the const enum cannot be imported under isolated builds). */
const ARGON2ID = 2 as Algorithm

/** L8: argon2 is memory-hard (19 MiB each); bound concurrency so a burst cannot exhaust the 384 MB container. */
export const ARGON2_MAX_CONCURRENT = 2
export const ARGON2_MAX_QUEUE = 20
const BUSY_RETRY_AFTER_S = '5'

export interface Semaphore {
  run<T>(task: () => Promise<T>): Promise<T>
}

/** FIFO semaphore: `max` tasks at once, at most `maxQueue` waiting; beyond that, 503 + Retry-After. */
export function createSemaphore(max: number, maxQueue: number): Semaphore {
  let active = 0
  let waiting: readonly (() => void)[] = []
  const release = (): void => {
    const [next, ...rest] = waiting
    if (next) {
      waiting = rest
      next()
    } else {
      active -= 1
    }
  }
  const acquire = (): Promise<void> => {
    if (active < max) {
      active += 1
      return Promise.resolve()
    }
    if (waiting.length >= maxQueue) {
      return Promise.reject(new HttpError(503, 'server_busy', undefined, { 'Retry-After': BUSY_RETRY_AFTER_S }))
    }
    // The slot is handed over directly by release(), so `active` stays unchanged.
    return new Promise<void>((resolve) => {
      waiting = [...waiting, resolve]
    })
  }
  return {
    async run(task) {
      await acquire()
      try {
        return await task()
      } finally {
        release()
      }
    },
  }
}

export interface PasswordHasher {
  hash(password: string): Promise<string>
  /** Always performs a full verification, even for an unknown account (constant-time-ish login). */
  verify(storedHash: string | null, password: string): Promise<boolean>
}

export function createPasswordHasher(
  params: Config['argon2'],
  limits: { readonly maxConcurrent: number; readonly maxQueue: number } = { maxConcurrent: ARGON2_MAX_CONCURRENT, maxQueue: ARGON2_MAX_QUEUE },
): PasswordHasher {
  const options = { algorithm: ARGON2ID, ...params }
  const gate = createSemaphore(limits.maxConcurrent, limits.maxQueue)
  let dummy: Promise<string> | null = null
  const dummyHash = (): Promise<string> => (dummy ??= hash(randomBytes(16).toString('hex'), options))

  return {
    hash: (password) => gate.run(() => hash(password, options)),
    verify: (storedHash, password) =>
      gate.run(async () => {
        const target = storedHash ?? (await dummyHash())
        try {
          const ok = await verify(target, password)
          return storedHash !== null && ok
        } catch {
          return false
        }
      }),
  }
}
