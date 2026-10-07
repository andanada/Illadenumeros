import type { Attempt } from '../../../core/progress/applyAnswer'
import { addDays, daysBetween, dayKey, MINUTE_MS } from './time'

export const SESSION_GAP_MS = 10 * MINUTE_MS
export const MAX_SESSION_MINUTES = 20
export const MAX_DAY_MINUTES = 12 * 60
export const ACTIVITY_DAYS = 28
const MAX_LEAD_IN_MS = 60_000

export interface Session {
  start: number
  end: number
  answers: number
  /** Played minutes: span + the thinking time before the first answer, capped at 20. */
  minutes: number
}

export interface DayActivity {
  day: string
  minutes: number
  answers: number
}

const clampRt = (rt: number): number => (Number.isFinite(rt) && rt > 0 ? Math.min(rt, MAX_LEAD_IN_MS) : 0)

/** Attempts with a usable timestamp, ordered by time (a copy only when needed). */
export function sortedValid(attempts: readonly Attempt[]): Attempt[] {
  const valid = attempts.filter((a) => Number.isFinite(a.createdAt) && a.createdAt > 0)
  let sorted = true
  for (let i = 1; i < valid.length && sorted; i++) sorted = (valid[i - 1]?.createdAt ?? 0) <= (valid[i]?.createdAt ?? 0)
  return sorted ? valid : [...valid].sort((a, b) => a.createdAt - b.createdAt)
}

/** Sessions: a gap of more than 10 minutes between two answers starts a new one. */
export function deriveSessions(attempts: readonly Attempt[]): Session[] {
  const sessions: Session[] = []
  let first: Attempt | undefined
  let last: Attempt | undefined
  let answers = 0
  const close = () => {
    if (!first || !last) return
    const span = last.createdAt - first.createdAt + clampRt(first.rtMs)
    sessions.push({ start: first.createdAt, end: last.createdAt, answers, minutes: Math.min(MAX_SESSION_MINUTES, span / MINUTE_MS) })
  }
  for (const a of sortedValid(attempts)) {
    if (last && a.createdAt - last.createdAt > SESSION_GAP_MS) {
      close()
      first = a
      answers = 0
    }
    first ??= a
    last = a
    answers += 1
  }
  close()
  return sessions
}

/** Last 28 days (oldest first, today last): minutes (from sessions) and answers per day. */
export function dailyActivity(attempts: readonly Attempt[], now: number): DayActivity[] {
  const days: DayActivity[] = Array.from({ length: ACTIVITY_DAYS }, (_, i) => ({
    day: dayKey(addDays(now, i - (ACTIVITY_DAYS - 1))),
    minutes: 0,
    answers: 0,
  }))
  const slot = (at: number): number => ACTIVITY_DAYS - 1 - daysBetween(at, now)
  const inRange = (i: number): boolean => i >= 0 && i < ACTIVITY_DAYS
  const sorted = sortedValid(attempts)
  const answers = days.map((d) => d.answers)
  for (const a of sorted) {
    const i = slot(a.createdAt)
    if (inRange(i)) answers[i] = (answers[i] ?? 0) + 1
  }
  const minutes = days.map(() => 0)
  for (const s of deriveSessions(sorted)) {
    const i = slot(s.start)
    if (inRange(i)) minutes[i] = Math.min(MAX_DAY_MINUTES, (minutes[i] ?? 0) + s.minutes)
  }
  return days.map((d, i) => ({ ...d, answers: answers[i] ?? 0, minutes: minutes[i] ?? 0 }))
}
