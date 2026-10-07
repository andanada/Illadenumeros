export interface LimitState {
  readonly allowed: boolean
  readonly retryAfterMs: number
}

export interface WindowLimiter {
  /** Records one hit if allowed (classic rate limit). */
  hit(key: string, now: number): LimitState
  /** Read-only: would one more event be allowed? */
  check(key: string, now: number): LimitState
  /** Records an event unconditionally (e.g. a failure counter). Returns the count inside the window. */
  record(key: string, now: number): number
  reset(key: string): void
}

const MAX_KEYS = 10_000

/** In-memory sliding-window counter (per process; the API runs as a single instance). */
export function createWindowLimiter(max: number, windowMs: number): WindowLimiter {
  const hits = new Map<string, readonly number[]>()
  const recent = (key: string, now: number): readonly number[] => (hits.get(key) ?? []).filter((t) => t > now - windowMs)
  const evictIdle = (now: number): void => {
    if (hits.size <= MAX_KEYS) return
    for (const [k, stamps] of hits) if ((stamps[stamps.length - 1] ?? 0) <= now - windowMs) hits.delete(k)
  }
  const stateOf = (stamps: readonly number[], now: number): LimitState =>
    stamps.length >= max ? { allowed: false, retryAfterMs: (stamps[stamps.length - max] ?? now) + windowMs - now } : { allowed: true, retryAfterMs: 0 }

  return {
    hit(key, now) {
      evictIdle(now)
      const stamps = recent(key, now)
      const state = stateOf(stamps, now)
      hits.set(key, state.allowed ? [...stamps, now] : stamps)
      return state
    },
    check: (key, now) => stateOf(recent(key, now), now),
    record(key, now) {
      evictIdle(now)
      const stamps = [...recent(key, now), now]
      hits.set(key, stamps)
      return stamps.length
    },
    reset(key) {
      hits.delete(key)
    },
  }
}
