import { medianOf, SPEED_GAME_IDS, type PastAttempt } from '../../../games/shared/speed/personalBest'

/**
 * Personal-best ribbons of the ticket counter. Only the child's OWN play, never numbers or grades:
 * 0 nothing yet · 1 «Ja tens el ritme» · 2 «Més ràpid que abans» · 3 «Rècord personal».
 */
export type RibbonTier = 0 | 1 | 2 | 3

export interface Ribbon {
  gameId: string
  tier: RibbonTier
  label: string
}

const MIN_ANSWERS = 3
const FASTER_BY = 0.97

const LABELS: Readonly<Record<RibbonTier, string>> = {
  0: 'Encara no hi ha cinta',
  1: 'Ja tens el ritme',
  2: 'Més ràpid que abans',
  3: 'Rècord personal',
}

const dayStart = (ms: number): number => {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Median clean response time of each play day of a game, oldest first (days with too few answers do not count). */
export function dayMedians(attempts: readonly PastAttempt[], gameId: string): { day: number; median: number }[] {
  const byDay = new Map<number, number[]>()
  for (const a of attempts) {
    if (a.gameId !== gameId || !a.correct || a.hintsUsed > 0) continue
    const day = dayStart(a.createdAt)
    byDay.set(day, [...(byDay.get(day) ?? []), a.rtMs])
  }
  return [...byDay.entries()]
    .filter(([, rts]) => rts.length >= MIN_ANSWERS)
    .map(([day, rts]) => ({ day, median: medianOf(rts) ?? 0 }))
    .sort((a, b) => a.day - b.day)
}

/** The ribbon of one game: the latest day against the days before it. Helped answers never count. */
export function ribbonFor(attempts: readonly PastAttempt[], gameId: string): Ribbon {
  const days = dayMedians(attempts, gameId)
  const last = days[days.length - 1]
  if (!last) return { gameId, tier: 0, label: LABELS[0] }
  const before = days.slice(0, -1)
  const tier: RibbonTier =
    before.length === 0
      ? 1
      : before.every((d) => last.median < d.median * FASTER_BY) && before.length >= 2
        ? 3
        : last.median < (before[before.length - 1]?.median ?? 0) * FASTER_BY
          ? 2
          : 1
  return { gameId, tier, label: LABELS[tier] }
}

export const ribbonsOf = (attempts: readonly PastAttempt[]): Ribbon[] => SPEED_GAME_IDS.map((id) => ribbonFor(attempts, id))
