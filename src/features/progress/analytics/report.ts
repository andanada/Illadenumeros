import type { SkillNode } from '../../../core/ambit/types'
import type { FactState } from '../../../core/engine/leitner'
import type { SkillState } from '../../../core/engine/mastery'
import type { Attempt } from '../../../core/progress/applyAnswer'
import { aggregateAttempts, type AttemptAggregate, type PeriodStats } from './aggregate'
import { buildFactGrid, type FactCell } from './factHeat'
import { topMisconceptions, type TopMisconception } from './misconceptionAdvice'
import { buildRecommendations, type Recommendation } from './recommendations'
import { dailyActivity, deriveSessions, sortedValid, type DayActivity } from './sessions'
import { groupByGrade, skillStatusOf, type GradeGroup } from './skillStatus'
import { daysFromKeys, daysPlayedThisWeek, levelEquivalent, playedStreak, trendWord, type LevelEquivalent } from './summary'

export interface ReportInput {
  skills: readonly SkillNode[]
  skillStates: Readonly<Record<string, SkillState | undefined>>
  factStates: Readonly<Record<string, FactState | undefined>>
  /** `rewards.daysPlayed` (YYYY-MM-DD). */
  daysPlayed: readonly string[]
  attempts: readonly Attempt[]
}

export interface SkillCell {
  skill: SkillNode
  state: SkillState | undefined
  status: ReturnType<typeof skillStatusOf>
}

export interface SkillGroupView extends Omit<GradeGroup, 'skills'> {
  cells: SkillCell[]
}

export interface ProgressReport {
  hasData: boolean
  level: LevelEquivalent
  summary: {
    daysThisWeek: number
    streak: number
    totalMinutes: number
    last7: PeriodStats
    prev7: PeriodStats
    accuracyTrend: string
    fluencyTrend: string
  }
  skillGroups: SkillGroupView[]
  addGrid: FactCell[][]
  mulGrid: FactCell[][]
  activity: DayActivity[]
  weeks: AttemptAggregate['weeks']
  misconceptions: TopMisconception[]
  recommendations: Recommendation[]
}

/** Everything the dashboard shows, computed from local data in a handful of passes. `now` is injected. */
export function buildProgressReport(input: ReportInput, now: number): ProgressReport {
  const targets = new Map(input.skills.map((s) => [s.id, s.fluencyTargetMs]))
  const aggregate = aggregateAttempts(input.attempts, now, (id) => targets.get(id) ?? 4000)
  const sorted = sortedValid(input.attempts)
  const days = new Set<number>([...aggregate.playedDays, ...daysFromKeys(input.daysPlayed)])
  const streak = playedStreak(days, now)
  const daysThisWeek = daysPlayedThisWeek(days, now)
  const totalMinutes = deriveSessions(sorted).reduce((n, s) => n + s.minutes, 0)

  return {
    hasData: aggregate.totalAttempts > 0 || Object.values(input.skillStates).some((s) => s !== undefined && s.attempts > 0),
    level: levelEquivalent(input.skills, input.skillStates),
    summary: {
      daysThisWeek,
      streak,
      totalMinutes,
      last7: aggregate.last7,
      prev7: aggregate.prev7,
      accuracyTrend: trendWord(aggregate.last7.accuracy, aggregate.prev7.accuracy),
      fluencyTrend: trendWord(aggregate.last7.fluency, aggregate.prev7.fluency),
    },
    skillGroups: groupByGrade(input.skills).map(({ skills, ...group }) => ({
      ...group,
      cells: skills.map((skill) => ({ skill, state: input.skillStates[skill.id], status: skillStatusOf(skill, input.skillStates) })),
    })),
    addGrid: buildFactGrid('add', input.factStates),
    mulGrid: buildFactGrid('mul', input.factStates),
    activity: dailyActivity(sorted, now),
    weeks: aggregate.weeks,
    misconceptions: topMisconceptions(aggregate.misconceptions),
    recommendations: buildRecommendations({
      now,
      skills: input.skills,
      skillStates: input.skillStates,
      factStates: input.factStates,
      aggregate,
      streak,
      daysThisWeek,
    }),
  }
}
