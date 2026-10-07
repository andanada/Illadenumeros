import { ApiError } from './api'
import { onProgressChanged } from './progressEvents'

/*
 * When to sync (only while logged in): at start, when the network comes back, when the tab becomes
 * visible, every 90 s while visible, and 5 s after the last progress change. Failures back off
 * exponentially (5 s .. 5 min) or for the server's Retry-After. Strictly silent: no UI here.
 */

export const INTERVAL_MS = 90_000
export const DEBOUNCE_MS = 5_000
export const BASE_BACKOFF_MS = 5_000
export const MAX_BACKOFF_MS = 5 * 60_000

export interface SchedulerOptions {
  readonly run: () => Promise<void>
}

export function createScheduler({ run }: SchedulerOptions) {
  let started = false
  let running = false
  let pending = false
  let failures = 0
  let backoffMs = 0
  let interval: ReturnType<typeof setInterval> | undefined
  let debounce: ReturnType<typeof setTimeout> | undefined
  let retry: ReturnType<typeof setTimeout> | undefined
  let unsubscribe: (() => void) | undefined

  const visible = (): boolean => typeof document === 'undefined' || document.visibilityState !== 'hidden'

  function delayFor(error: unknown): number {
    const exponential = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.min(failures - 1, 16))
    return error instanceof ApiError && error.retryAfterMs !== undefined ? Math.min(Math.max(error.retryAfterMs, BASE_BACKOFF_MS), 60 * 60_000) : exponential
  }

  function scheduleRetry(ms: number): void {
    clearTimeout(retry)
    backoffMs = ms
    retry = setTimeout(() => {
      retry = undefined
      trigger(true)
    }, ms)
  }

  function execute(): void {
    running = true
    run()
      .then(
        () => {
          failures = 0
          backoffMs = 0
          clearTimeout(retry)
          retry = undefined
        },
        (error: unknown) => {
          failures += 1
          if (started) scheduleRetry(delayFor(error))
        },
      )
      .finally(() => {
        running = false
        if (pending && started) {
          pending = false
          trigger()
        }
      })
  }

  /** Runs a sync now unless one is running (then one more after it) or we are backing off (unless forced). */
  function trigger(force = false): void {
    if (!started) return
    if (running) {
      pending = true
      return
    }
    if (retry !== undefined && !force) return
    if (force) {
      clearTimeout(retry)
      retry = undefined
    }
    execute()
  }

  const onOnline = (): void => trigger(true)
  const onVisibility = (): void => {
    if (visible()) trigger()
  }
  const onChange = (): void => {
    clearTimeout(debounce)
    debounce = setTimeout(() => {
      debounce = undefined
      trigger()
    }, DEBOUNCE_MS)
  }

  function start(): void {
    if (started) return
    started = true
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)
    unsubscribe = onProgressChanged(onChange)
    interval = setInterval(() => {
      if (visible()) trigger()
    }, INTERVAL_MS)
    trigger()
  }

  function stop(): void {
    if (!started) return
    started = false
    pending = false
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisibility)
    unsubscribe?.()
    unsubscribe = undefined
    clearInterval(interval)
    clearTimeout(debounce)
    clearTimeout(retry)
    interval = debounce = retry = undefined
    failures = 0
    backoffMs = 0
  }

  /** Current back-off delay (0 when not backing off). */
  const retryInMs = (): number => (retry === undefined ? 0 : backoffMs)

  return { start, stop, trigger: () => trigger(), retryInMs, isStarted: () => started }
}

export type Scheduler = ReturnType<typeof createScheduler>
