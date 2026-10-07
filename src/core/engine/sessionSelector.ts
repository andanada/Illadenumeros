import type { SkillNode } from '../ambit/types'
import type { Rng } from '../rng'
import { isUnlocked } from './graph'
import { isDue, type FactState } from './leitner'
import type { SkillState } from './mastery'

export type SelectionMode = 'repas' | 'consolidacio' | 'nou'

export interface Selection {
  skillId: string
  factKey?: string
  mode: SelectionMode
}

export interface SelectorInput {
  skills: readonly SkillNode[]
  skillStates: Readonly<Record<string, SkillState>>
  factStates: Readonly<Record<string, FactState>>
  factsForSkill: (skillId: string) => string[]
  /** Results of the current session, most recent last. */
  recent: readonly boolean[]
  now: number
  rng: Rng
  /** Skills the current game can show; defaults to all. */
  restrictTo?: readonly string[]
}

const REVIEW_SHARE = 0.7
const OCCASIONAL_REVIEW = 0.25
const MAX_FACTS_IN_FLIGHT = 3
const ACCURACY_WINDOW = 8
const LOW_ACCURACY = 0.7
const HIGH_ACCURACY = 0.9

const accuracyOf = (recent: readonly boolean[]): number => {
  const window = recent.slice(-ACCURACY_WINDOW)
  return window.length < 4 ? 0.8 : window.filter(Boolean).length / window.length
}

const isLearning = (s: SkillState | undefined): boolean => s !== undefined && (s.status === 'aprenent' || s.status === 'consolidant')

function availableSkills(input: SelectorInput): SkillNode[] {
  const masteryOf = (id: string): number => input.skillStates[id]?.mastery ?? 0
  const allowed = input.skills.filter((skill) => input.restrictTo === undefined || input.restrictTo.includes(skill.id))
  const settled = (id: string): boolean => ['consolidant', 'dominada'].includes(input.skillStates[id]?.status ?? '')
  const open = allowed.filter((skill) => settled(skill.id) || isUnlocked(skill, masteryOf))
  // A game that only knows locked skills must still show something of its own, never an unrelated skill.
  return open.length > 0 ? open : allowed
}

/** Facts already being learned (seen, not yet in box 3). */
function inFlight(input: SelectorInput, skillId: string): string[] {
  return input.factsForSkill(skillId).filter((key) => {
    const fact = input.factStates[key]
    return fact !== undefined && fact.attempts > 0 && fact.box < 3
  })
}

/** Picks the fact to ask for a skill, introducing new facts only while fewer than 3 are in flight. */
function pickFact(input: SelectorInput, skill: SkillNode): string | undefined {
  if (!skill.hasFacts) return undefined
  const learning = inFlight(input, skill.id)
  const unseen = input.factsForSkill(skill.id).filter((key) => (input.factStates[key]?.attempts ?? 0) === 0)
  if (learning.length < MAX_FACTS_IN_FLIGHT && unseen.length > 0 && (learning.length === 0 || input.rng.next() < 0.35)) {
    return input.rng.pick(unseen)
  }
  if (learning.length > 0) return input.rng.pick(learning)
  return input.rng.pick(input.factsForSkill(skill.id))
}

function reviewPick(input: SelectorInput, skills: SkillNode[]): Selection | undefined {
  const due = skills
    .filter((s) => s.hasFacts)
    .flatMap((s) =>
      input.factsForSkill(s.id).flatMap((key) => {
        const fact = input.factStates[key]
        return fact && fact.attempts > 0 && isDue(fact, input.now) ? [{ skillId: s.id, fact }] : []
      }),
    )
    .sort((x, y) => x.fact.dueAt - y.fact.dueAt)
  const oldest = due[0]
  if (oldest) return { skillId: oldest.skillId, factKey: oldest.fact.factKey, mode: 'repas' }

  const mastered = skills.filter((s) => input.skillStates[s.id]?.status === 'dominada')
  // Nothing due: revisit mastered content now and then, never most of the time.
  if (mastered.length === 0 || input.rng.next() >= OCCASIONAL_REVIEW) return undefined
  const skill = input.rng.pick(mastered)
  return withFact(input, skill, 'repas')
}

function withFact(input: SelectorInput, skill: SkillNode, mode: SelectionMode): Selection {
  const factKey = pickFact(input, skill)
  return factKey === undefined ? { skillId: skill.id, mode } : { skillId: skill.id, factKey, mode }
}

export function selectNext(input: SelectorInput): Selection {
  const skills = availableSkills(input)
  const fallback = skills[0] ?? input.skills.find((s) => s.prereqs.length === 0) ?? input.skills[0]
  if (!fallback) throw new Error('No hi ha habilitats')

  const accuracy = accuracyOf(input.recent)
  const newShare = accuracy < LOW_ACCURACY ? 0 : accuracy > HIGH_ACCURACY ? 0.2 : 0.1
  const learning = skills.filter((s) => isLearning(input.skillStates[s.id]))
  const fresh = skills.filter((s) => input.skillStates[s.id] === undefined)
  const roll = input.rng.next()

  if (roll < REVIEW_SHARE) {
    const review = reviewPick(input, skills)
    if (review) return review
  }
  if (roll >= 1 - newShare && fresh[0]) return withFact(input, fresh[0], 'nou')
  if (learning.length > 0) {
    // When struggling, stay on the easiest learning skill; otherwise vary.
    const skill = accuracy < LOW_ACCURACY ? (learning[0] as SkillNode) : input.rng.pick(learning)
    return withFact(input, skill, 'consolidacio')
  }
  if (fresh[0]) return withFact(input, fresh[0], 'nou')
  return reviewPick(input, skills) ?? withFact(input, fallback, 'consolidacio')
}

/** Earliest skill (graph order) still being learned, else the first new unlocked one. */
export function focusSkill(skills: readonly SkillNode[], skillStates: Readonly<Record<string, SkillState>>): string {
  const learning = skills.find((s) => isLearning(skillStates[s.id]))
  if (learning) return learning.id
  const masteryOf = (id: string): number => skillStates[id]?.mastery ?? 0
  const fresh = skills.find((s) => skillStates[s.id] === undefined && isUnlocked(s, masteryOf))
  return (fresh ?? skills[0])?.id ?? ''
}
