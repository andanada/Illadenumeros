import type { Attempt } from '../../../core/progress/applyAnswer'

export const MIN = 60_000
export const DAY = 24 * 60 * MIN
/** Wednesday 7 October 2026, noon. */
export const NOW = new Date(2026, 9, 7, 12, 0).getTime()

let counter = 0
export function att(at: number, extra: Partial<Attempt> = {}): Attempt {
  counter += 1
  return {
    id: `a${counter}`,
    ambitId: 'mates',
    skillId: 'A4',
    correct: true,
    rtMs: 2000,
    hintsUsed: 0,
    cpaStage: 'concret',
    gameId: 'marc-magic',
    sessionId: 's',
    createdAt: at,
    ...extra,
  }
}

/** `n` attempts, one every 5 s, starting `daysAgo` days before NOW at 10:00. */
export function batch(daysAgo: number, n: number, extra: Partial<Attempt> | ((i: number) => Partial<Attempt>) = {}): Attempt[] {
  const start = new Date(2026, 9, 7 - daysAgo, 10, 0).getTime()
  return Array.from({ length: n }, (_, i) => att(start + i * 5000, typeof extra === 'function' ? extra(i) : extra))
}
