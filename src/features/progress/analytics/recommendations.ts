import type { SkillNode } from '../../../core/ambit/types'
import { medianRt, type FactState } from '../../../core/engine/leitner'
import type { SkillState } from '../../../core/engine/mastery'
import { REGIONS } from '../../world-map/stops'
import type { AttemptAggregate } from './aggregate'
import { levelEquivalent } from './summary'
import { daysBetween } from './time'

export const MAX_RECOMMENDATIONS = 4

/** Thresholds of the rules, in one place. */
export const THRESHOLDS = {
  lowAccuracy: 0.65,
  lowAccuracyMinAttempts: 20,
  noPlayDays: 3,
  stuckMinAttempts: 20,
  stuckMinPerHalf: 8,
  stuckMinGain: 0.05,
  stuckMaxMastery: 0.85,
  slowFactMinAttempts: 3,
  slowFactFactor: 2,
  slowFactMinCount: 3,
  nextRegionMastered: 0.8,
  nextRegionStarted: 0.5,
  habitDaysThisWeek: 4,
  habitStreak: 5,
} as const

export interface RecommendationInput {
  now: number
  skills: readonly SkillNode[]
  skillStates: Readonly<Record<string, SkillState | undefined>>
  factStates: Readonly<Record<string, FactState | undefined>>
  aggregate: Pick<AttemptAggregate, 'last7' | 'lastPlayedAt' | 'skills'>
  streak: number
  daysThisWeek: number
}

export type RecommendationId = 'low-accuracy' | 'no-play' | 'stuck-skill' | 'slow-facts' | 'next-region' | 'habit'

export interface Recommendation {
  id: RecommendationId
  /** Lower = more important. */
  priority: number
  emoji: string
  title: string
  text: string
}

type Rule = (input: RecommendationInput) => Recommendation | undefined

const FACT_TARGET_MS = { add: 3000, mul: 4000 } as const

/** "mul:7x8" -> "7 × 8"; other kinds are not shown. */
export function factLabel(key: string): string | undefined {
  const m = /^(add|mul):(\d+)[+x](\d+)$/.exec(key)
  return m ? `${m[2]} ${m[1] === 'add' ? '+' : '×'} ${m[3]}` : undefined
}

const lowAccuracy: Rule = ({ aggregate }) => {
  const { attempts, accuracy } = aggregate.last7
  if (accuracy === undefined || attempts < THRESHOLDS.lowAccuracyMinAttempts || accuracy >= THRESHOLDS.lowAccuracy) return undefined
  return {
    id: 'low-accuracy',
    priority: 1,
    emoji: '🌤️',
    title: 'Aquests dies costa una mica més',
    text: 'Passa de tant en tant i no vol dir res dolent. Proveu jocs més fàcils per recuperar la confiança o feu una pausa d’un dia o dos: tornarà amb més ganes.',
  }
}

const noPlay: Rule = ({ aggregate, now }) => {
  if (aggregate.lastPlayedAt === undefined) return undefined
  const days = daysBetween(aggregate.lastPlayedAt, now)
  if (days < THRESHOLDS.noPlayDays) return undefined
  return {
    id: 'no-play',
    priority: 2,
    emoji: '🌱',
    title: 'Fa uns dies que no juga',
    text: `Han passat ${days} dies. Cinc minuts amb el seu joc preferit ja són un bon retorn: la missió del dia és curta i el que ja sap continua aquí.`,
  }
}

const accuracyOf = (attempts: number, correct: number): number => (attempts > 0 ? correct / attempts : 0)

const stuckSkill: Rule = ({ aggregate, skillStates, skills }) => {
  const candidates = skills.flatMap((skill) => {
    const w = aggregate.skills[skill.id]
    const state = skillStates[skill.id]
    if (!w || !state || state.status === 'dominada' || state.mastery >= THRESHOLDS.stuckMaxMastery) return []
    const total = w.olderAttempts + w.recentAttempts
    if (total < THRESHOLDS.stuckMinAttempts || w.olderAttempts < THRESHOLDS.stuckMinPerHalf || w.recentAttempts < THRESHOLDS.stuckMinPerHalf) return []
    const gain = accuracyOf(w.recentAttempts, w.recentCorrect) - accuracyOf(w.olderAttempts, w.olderCorrect)
    return gain < THRESHOLDS.stuckMinGain ? [{ skill, total }] : []
  })
  const worst = candidates.sort((a, b) => b.total - a.total)[0]
  if (!worst) return undefined
  return {
    id: 'stuck-skill',
    priority: 3,
    emoji: '🧩',
    title: 'Hi ha una habilitat que necessita una altra mirada',
    text: `«${worst.skill.title}» s’ha treballat molt, però encara no va a més. Potser va bé provar-la amb material de veritat (fitxes, monedes) o jugar-hi acompanyat/da durant un parell de sessions.`,
  }
}

const slowFacts: Rule = ({ factStates }) => {
  const slow = Object.values(factStates).flatMap((state) => {
    if (!state || state.attempts < THRESHOLDS.slowFactMinAttempts || state.correct === 0) return []
    const kind = state.factKey.startsWith('add:') ? 'add' : state.factKey.startsWith('mul:') ? 'mul' : undefined
    const label = factLabel(state.factKey)
    const median = medianRt(state)
    if (!kind || !label || median === undefined || median <= FACT_TARGET_MS[kind] * THRESHOLDS.slowFactFactor) return []
    return [{ label, median }]
  })
  if (slow.length < THRESHOLDS.slowFactMinCount) return undefined
  const list = slow
    .sort((a, b) => b.median - a.median)
    .slice(0, 3)
    .map((s) => s.label)
    .join(', ')
  return {
    id: 'slow-facts',
    priority: 4,
    emoji: '🐢',
    title: 'Alguns fets encara són lents',
    text: `Els sap, però necessita temps per pensar-los: ${list}. Cinc minuts al dia amb aquests fets, sense pressa, ajuden que passin a la memòria.`,
  }
}

const nextRegion: Rule = ({ skills, skillStates }) => {
  const level = levelEquivalent(skills, skillStates)
  const ready = level.perGrade.find((g, i) => {
    const next = level.perGrade[i + 1]
    return next !== undefined && g.pct >= THRESHOLDS.nextRegionMastered * 100 && next.pct < THRESHOLDS.nextRegionStarted * 100
  })
  const next = ready && level.perGrade.find((g) => g.grade === ready.grade + 1)
  if (!ready || !next) return undefined
  const region = REGIONS.find((r) => r.grade === next.grade)
  return {
    id: 'next-region',
    priority: 5,
    emoji: region?.emoji ?? '🗺️',
    title: 'Preparada per al següent tram',
    text: `Domina gairebé tot ${ready.label}. Ja pot explorar ${region ? `«${region.name}»` : `${next.label}`} al mapa: és un bon moment per estrenar-lo!`,
  }
}

const habit: Rule = ({ streak, daysThisWeek }) => {
  if (streak < THRESHOLDS.habitStreak && daysThisWeek < THRESHOLDS.habitDaysThisWeek) return undefined
  return {
    id: 'habit',
    priority: 6,
    emoji: '🎉',
    title: 'Un hàbit molt ben format',
    text: 'Jugar amb constància és el que més fa avançar. Celebreu-ho: poques sessions curtes i seguides valen més que una de molt llarga.',
  }
}

const RULES: readonly Rule[] = [lowAccuracy, noPlay, stuckSkill, slowFacts, nextRegion, habit]

/** Active recommendations, most important first, at most 4. */
export function buildRecommendations(input: RecommendationInput): Recommendation[] {
  return RULES.flatMap((rule) => {
    const rec = rule(input)
    return rec ? [rec] : []
  })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_RECOMMENDATIONS)
}
