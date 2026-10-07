import type { MisconceptionId } from '../../../core/ambit/types'
import type { Attempt } from '../../../core/progress/applyAnswer'
import { FLUENCY_LENIENCY } from '../../../core/progress/applyAnswer'
import { dayIndex } from './time'

export const MIN_WEEK_ATTEMPTS = 10
export const MISCONCEPTION_DAYS = 30
const WEEKS = 4

export interface PeriodStats {
  attempts: number
  correct: number
  fluent: number
  /** 0..1, undefined without attempts. */
  accuracy: number | undefined
  /** Share of the answers that were correct, unaided and fast; undefined without attempts. */
  fluency: number | undefined
}

export interface WeekStats {
  attempts: number
  correct: number
  accuracy: number | undefined
  /** Median response time of the correct answers. */
  medianRtMs: number | undefined
  /** False below 10 attempts: the charts show "poques dades". */
  enough: boolean
}

export interface SkillWindow {
  olderAttempts: number
  olderCorrect: number
  recentAttempts: number
  recentCorrect: number
}

export interface AttemptAggregate {
  last7: PeriodStats
  prev7: PeriodStats
  /** Oldest first; the last one is the 7 days ending today. */
  weeks: WeekStats[]
  misconceptions: Partial<Record<MisconceptionId, number>>
  lastPlayedAt: number | undefined
  playedDays: Set<number>
  totalAttempts: number
  skills: Record<string, SkillWindow>
}

interface MutablePeriod {
  attempts: number
  correct: number
  fluent: number
}

const ratio = (part: number, whole: number): number | undefined => (whole > 0 ? part / whole : undefined)

const finishPeriod = (p: MutablePeriod): PeriodStats => ({ ...p, accuracy: ratio(p.correct, p.attempts), fluency: ratio(p.fluent, p.attempts) })

export function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

/**
 * One pass over the whole history. `targetMsOf` gives the fluency target of a skill; an answer is
 * fluent when it is correct, unaided and within that target times the app's leniency.
 * Attempts dated after `now` (clock changes) are ignored.
 */
export function aggregateAttempts(attempts: readonly Attempt[], now: number, targetMsOf: (skillId: string) => number): AttemptAggregate {
  const today = dayIndex(now)
  const periods: MutablePeriod[] = [0, 1].map(() => ({ attempts: 0, correct: 0, fluent: 0 }))
  const weekAttempts = Array.from({ length: WEEKS }, () => 0)
  const weekCorrect = Array.from({ length: WEEKS }, () => 0)
  const weekRts: number[][] = Array.from({ length: WEEKS }, () => [])
  const misconceptions: Partial<Record<MisconceptionId, number>> = {}
  const skills: Record<string, SkillWindow> = {}
  const playedDays = new Set<number>()
  let lastPlayedAt: number | undefined
  let total = 0

  for (const a of attempts) {
    const at = a.createdAt
    if (!Number.isFinite(at) || at <= 0 || at > now) continue
    total += 1
    const idx = dayIndex(at)
    const ago = today - idx
    playedDays.add(idx)
    if (lastPlayedAt === undefined || at > lastPlayedAt) lastPlayedAt = at
    if (ago < 0 || ago >= MISCONCEPTION_DAYS) continue

    if (!a.correct && a.misconception) misconceptions[a.misconception] = (misconceptions[a.misconception] ?? 0) + 1
    const rtOk = Number.isFinite(a.rtMs) && a.rtMs >= 0
    const fluent = a.correct && a.hintsUsed === 0 && rtOk && a.rtMs <= targetMsOf(a.skillId) * FLUENCY_LENIENCY

    if (ago < 14) {
      const w = (skills[a.skillId] ??= { olderAttempts: 0, olderCorrect: 0, recentAttempts: 0, recentCorrect: 0 })
      if (ago < 7) {
        w.recentAttempts += 1
        if (a.correct) w.recentCorrect += 1
      } else {
        w.olderAttempts += 1
        if (a.correct) w.olderCorrect += 1
      }
    }
    if (ago >= WEEKS * 7) continue

    const period = periods[ago < 7 ? 0 : ago < 14 ? 1 : 2]
    if (period) {
      period.attempts += 1
      if (a.correct) period.correct += 1
      if (fluent) period.fluent += 1
    }
    const slot = WEEKS - 1 - Math.floor(ago / 7)
    weekAttempts[slot] = (weekAttempts[slot] ?? 0) + 1
    if (a.correct) {
      weekCorrect[slot] = (weekCorrect[slot] ?? 0) + 1
      if (rtOk && a.rtMs > 0) weekRts[slot]?.push(a.rtMs)
    }
  }

  const weeks: WeekStats[] = weekAttempts.map((n, i) => ({
    attempts: n,
    correct: weekCorrect[i] ?? 0,
    accuracy: ratio(weekCorrect[i] ?? 0, n),
    medianRtMs: median(weekRts[i] ?? []),
    enough: n >= MIN_WEEK_ATTEMPTS,
  }))
  return {
    last7: finishPeriod(periods[0] ?? { attempts: 0, correct: 0, fluent: 0 }),
    prev7: finishPeriod(periods[1] ?? { attempts: 0, correct: 0, fluent: 0 }),
    weeks,
    misconceptions,
    lastPlayedAt,
    playedDays,
    totalAttempts: total,
    skills,
  }
}
