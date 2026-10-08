/** The part of a stored attempt needed to frame progress against the child's own past. */
export interface PastAttempt {
  gameId: string
  correct: boolean
  hintsUsed: number
  rtMs: number
  createdAt: number
}

export const SPEED_GAME_IDS: readonly string[] = ['tren-sumes', 'pesca-sumes', 'duel-llampec']
const MIN_ANSWERS = 3
const FASTER_BY = 0.97
const DAY_MS = 24 * 60 * 60 * 1000

export interface PersonalBest {
  headline: string
  faster: boolean
  record: boolean
}

export function medianOf(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

/** Local midnight of the day containing `ms`. */
const dayStart = (ms: number): number => {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Median clean response time of every earlier play day, newest first. */
function dayMedians(past: readonly PastAttempt[]): { day: number; median: number }[] {
  const byDay = new Map<number, number[]>()
  for (const a of past) {
    if (!SPEED_GAME_IDS.includes(a.gameId) || !a.correct || a.hintsUsed > 0) continue
    const day = dayStart(a.createdAt)
    byDay.set(day, [...(byDay.get(day) ?? []), a.rtMs])
  }
  return [...byDay.entries()]
    .filter(([, rts]) => rts.length >= MIN_ANSWERS)
    .map(([day, rts]) => ({ day, median: medianOf(rts) ?? 0 }))
    .sort((a, b) => b.day - a.day)
}

const KEEP_GOING = 'Bon ritme! Cada ronda et fa més àgil.'

/**
 * Compares this round with the child's OWN earlier play only (never with anyone else, no grades, no numbers).
 * `past` must hold attempts from BEFORE this round; `roundRts` are the clean, correct times of the round just played.
 */
export function compareWithPast(past: readonly PastAttempt[], roundRts: readonly number[], now: number): PersonalBest {
  const today = dayStart(now)
  const median = medianOf(roundRts)
  const days = dayMedians(past)
  const last = days[0]
  if (median === undefined || roundRts.length < MIN_ANSWERS) return { headline: KEEP_GOING, faster: false, record: false }
  if (!last) return { headline: 'Ja tenim el teu ritme! La pròxima vegada, a superar-lo.', faster: false, record: false }
  if (median >= last.median * FASTER_BY) return { headline: KEEP_GOING, faster: false, record: false }

  const record = days.every((d) => median < d.median * FASTER_BY)
  const headline =
    last.day === today
      ? 'Has anat més ràpid que a la ronda d’abans!'
      : last.day === dayStart(today - DAY_MS / 2)
        ? 'Avui has anat més ràpid que ahir!'
        : 'Has anat més ràpid que l’última vegada!'
  return { headline, faster: true, record }
}
