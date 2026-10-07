import type { SkillNode } from '../../../core/ambit/types'
import type { SkillState } from '../../../core/engine/mastery'
import type { Attempt } from '../../../core/progress/applyAnswer'
import { deriveSessions } from './sessions'
import { GRADE_LABELS, groupByGrade } from './skillStatus'
import { dayIndex } from './time'

export interface GradeProgress {
  grade: number
  label: string
  total: number
  mastered: number
  /** Rounded 0..100. */
  pct: number
}

export interface LevelEquivalent {
  workingGrade: number | undefined
  perGrade: GradeProgress[]
  text: string
}

const ACTIVE = new Set(['aprenent', 'consolidant'])
const of = (label: string): string => (/^[aeiouàèéíòóú]/i.test(label) ? `d’${label}` : `de ${label}`)

/** Plain-Catalan equivalent level, from how many skills of each grade are mastered. */
export function levelEquivalent(skills: readonly SkillNode[], states: Readonly<Record<string, SkillState | undefined>>): LevelEquivalent {
  const groups = groupByGrade(skills)
  const perGrade: GradeProgress[] = groups.map((g) => {
    const mastered = g.skills.filter((s) => states[s.id]?.status === 'dominada').length
    return { grade: g.grade, label: g.label, total: g.skills.length, mastered, pct: Math.round((mastered / g.skills.length) * 100) }
  })
  const touched = skills.some((s) => {
    const status = states[s.id]?.status
    return status !== undefined && status !== 'nova' && status !== 'bloquejada'
  })
  if (!touched || perGrade.length === 0) {
    return { workingGrade: undefined, perGrade, text: 'Encara no hi ha prou activitat per situar el nivell. Aviat es veurà aquí.' }
  }
  const activeGrades = groups.filter((g) => g.skills.some((s) => ACTIVE.has(states[s.id]?.status ?? ''))).map((g) => g.grade)
  const unfinished = perGrade.find((p) => p.pct < 100)
  const workingGrade = activeGrades.length > 0 ? Math.max(...activeGrades) : unfinished?.grade
  if (workingGrade === undefined) {
    const last = perGrade[perGrade.length - 1]
    return { workingGrade: undefined, perGrade, text: `Domina tots els continguts de ${last?.label ?? ''}. Enhorabona!` }
  }
  const current = perGrade.find((p) => p.grade === workingGrade)
  const below = perGrade.find((p) => p.grade === workingGrade - 1)
  const label = GRADE_LABELS[workingGrade] ?? String(workingGrade)
  const text = below
    ? `Ara treballa continguts de ${label} i ja domina el ${below.pct} % ${of(below.label)}.`
    : `Ara treballa continguts de ${label} i ja domina el ${current?.pct ?? 0} % d’aquest curs.`
  return { workingGrade, perGrade, text }
}

/** Consecutive days played ending today (or yesterday, so the streak is not lost before playing today). */
export function playedStreak(days: ReadonlySet<number>, now: number): number {
  const today = dayIndex(now)
  let cursor = days.has(today) ? today : today - 1
  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor -= 1
  }
  return streak
}

/** Days played since Monday of the current week. */
export function daysPlayedThisWeek(days: ReadonlySet<number>, now: number): number {
  const today = dayIndex(now)
  const sinceMonday = (new Date(now).getDay() + 6) % 7
  let count = 0
  for (let i = 0; i <= sinceMonday; i++) if (days.has(today - i)) count += 1
  return count
}

/** Day indices from the `daysPlayed` strings (YYYY-MM-DD) of the rewards. */
export function daysFromKeys(keys: readonly string[]): number[] {
  return keys.flatMap((key) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
    if (!m) return []
    return [Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000)]
  })
}

export const totalMinutes = (attempts: readonly Attempt[]): number => deriveSessions(attempts).reduce((n, s) => n + s.minutes, 0)

/** Calm wording of a change between two ratios; ±3 points is "estable". */
export function trendWord(current: number | undefined, previous: number | undefined): string {
  if (current === undefined || previous === undefined) return 'sense dades'
  const diff = current - previous
  if (Math.abs(diff) < 0.03) return 'estable'
  return diff > 0 ? 'puja' : 'baixa una mica'
}
