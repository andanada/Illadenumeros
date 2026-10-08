import { factFamily } from '../../ambits/mates/factFamilies'
import { factsForSkill } from '../../ambits/mates/facts'
import { factOwner } from '../../ambits/mates/operations'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { OPERATION_IDS, type OperationId, type SkillNode } from '../ambit/types'
import { applyAnswer } from '../progress/applyAnswer'
import { createRng, type Rng } from '../rng'
import { isFollowUpStillValid, planFamilyPartners, type QueuedSelection } from './family'
import type { FactState } from './leitner'
import type { SkillState } from './mastery'
import { selectNext, type Selection } from './sessionSelector'
import { MASTERY_THRESHOLDS } from './thresholds'

const DAY_MS = 86_400_000
const START = new Date(2026, 0, 5, 12, 0).getTime()

/** A synthetic child. Memory of each fact grows with clean practice and fades with the days between exposures. */
export interface LearnerProfile {
  name: string
  /** Probability of a correct answer on a brand-new fact / on a very well known one. */
  floor: number
  ceiling: number
  /** Clean answers needed to get most of the way from floor to ceiling. */
  learningRate: number
  /** Days of memory stability per unit of practice: well practised facts fade much more slowly. */
  forgetting: number
  /** Response time (ms) for a new fact / a well known one. */
  slowRt: number
  fastRt: number
  /** Chance a wrong answer is followed by a hinted correct one (always, as the app reveals the answer). */
  minutesPerDay: number
}

export const STEADY_LEARNER: LearnerProfile = { name: 'steady', floor: 0.6, ceiling: 0.95, learningRate: 5, forgetting: 10, slowRt: 4400, fastRt: 1700, minutesPerDay: 12 }
/** Fast but careless: never really learns, answers right about 70 % of the time. */
export const CARELESS_LEARNER: LearnerProfile = { name: 'careless', floor: 0.7, ceiling: 0.7, learningRate: 1, forgetting: 10, slowRt: 1300, fastRt: 1300, minutesPerDay: 12 }
/** Accurate but slow: right 97 % of the time, never faster than about 4.2 s. */
export const SLOW_LEARNER: LearnerProfile = { name: 'slow', floor: 0.97, ceiling: 0.97, learningRate: 1, forgetting: 10, slowRt: 4200, fastRt: 4200, minutesPerDay: 12 }

interface Memory {
  n: number
  lastDay: number
}

export interface SimResult {
  /** First day (1-based) on which every fact skill of the operation was "dominada". */
  dayMastered: Partial<Record<OperationId, number>>
  /** Day the operation in progress changed, for the report. */
  accuracy: number
  questions: number
  /** Share of questions on the operation in progress (while there was one). */
  coreShare: number
  /** Most facts in flight right before a brand-new fact was introduced (must stay under 3). */
  maxInFlight: number
  skillStates: Record<string, SkillState>
  factStates: Record<string, FactState>
}

interface SimState {
  skillStates: Record<string, SkillState>
  factStates: Record<string, FactState>
  cleanDays: Record<string, string[]>
  memory: Map<string, Memory>
}

const lognormal = (rng: Rng, median: number, sigma = 0.22): number => {
  const u = Math.max(1e-9, rng.next())
  const v = rng.next()
  return median * Math.exp(sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v))
}

const fade = (learner: LearnerProfile, mem: Memory, day: number): number => mem.n * Math.exp(-(day - mem.lastDay) / (learner.forgetting * (1 + mem.n)))

function respond(learner: LearnerProfile, mem: Memory | undefined, day: number, rng: Rng, hasFacts: boolean): { correct: boolean; rtMs: number } {
  if (!hasFacts) return { correct: rng.next() < 0.9, rtMs: lognormal(rng, 6000) }
  const faded = mem ? fade(learner, mem, day) : 0
  const known = 1 - Math.exp(-faded / learner.learningRate)
  const p = learner.floor + (learner.ceiling - learner.floor) * known
  return { correct: rng.next() < p, rtMs: lognormal(rng, learner.slowRt + (learner.fastRt - learner.slowRt) * known) }
}

const isMasteredOp = (states: Record<string, SkillState>, op: OperationId): boolean =>
  MATES_SKILLS.filter((s) => s.operation === op).every((s) => states[s.id]?.status === 'dominada')

const inFlightNow = (facts: Record<string, FactState>): number =>
  Object.values(facts).filter((f) => f.attempts > 0 && (f.box === 0 || f.streak < MASTERY_THRESHOLDS.leitner.inFlightStreak)).length

/** Runs the real selector, family planner and answer pipeline for a synthetic child, one 12-minute session a day. */
export interface TraceEvent {
  day: number
  spent: number
  selection: Selection
  correct: boolean
  box: number | undefined
}

export function simulate(learner: LearnerProfile, days: number, seed = 'sim', stopWhenAllMastered = true, trace?: (event: TraceEvent) => void): SimResult {
  const rng = createRng(seed)
  const state: SimState = { skillStates: {}, factStates: {}, cleanDays: {}, memory: new Map() }
  const dayMastered: SimResult['dayMastered'] = {}
  let questions = 0
  let correctFirst = 0
  let coreQuestions = 0
  let coreCounted = 0
  let maxInFlight = 0

  for (let day = 1; day <= days; day++) {
    const clock = START + (day - 1) * DAY_MS
    const sessionId = `d${day}`
    const history: { skillId: string; factKey?: string }[] = []
    const results: boolean[] = []
    let queue: QueuedSelection[] = []
    let counter = 0
    let spent = 0
    const budget = learner.minutesPerDay * 60_000
    const warmupEnd = 75_000

    while (spent < budget) {
      const now = clock + spent
      queue = queue.filter((q) => isFollowUpStillValid(q, { skills: MATES_SKILLS, factStates: state.factStates, factsForSkill }))
      const due = queue.find((q) => q.afterN <= counter)
      let selection: Selection
      const followUp = due !== undefined
      if (due) {
        queue = queue.filter((q) => q !== due)
        selection = due.selection
      } else {
        selection = selectNext({
          skills: MATES_SKILLS,
          skillStates: state.skillStates,
          factStates: state.factStates,
          factsForSkill,
          recent: results,
          now,
          rng,
          history,
          ...(spent < warmupEnd ? { minBox: MASTERY_THRESHOLDS.mission.warmupMinBox } : {}),
        })
      }
      history.push({ skillId: selection.skillId, ...(selection.factKey ? { factKey: selection.factKey } : {}) })
      counter += 1
      const skill = MATES_SKILLS.find((s) => s.id === selection.skillId) as SkillNode
      const core = OPERATION_IDS.find((op) => !isMasteredOp(state.skillStates, op))
      if (core !== undefined) {
        coreCounted += 1
        if (skill.operation === core) coreQuestions += 1
      }

      const key = selection.factKey
      if (key && (state.factStates[key]?.attempts ?? 0) === 0) maxInFlight = Math.max(maxInFlight, inFlightNow(state.factStates))
      const first = respond(learner, key ? state.memory.get(key) : undefined, day, rng, skill.hasFacts)
      const record = (correct: boolean, rtMs: number, hintsUsed: number, retry: boolean): void => {
        const outcome = applyAnswer(
          {
            skill,
            ...(key ? { factKey: key } : {}),
            correct,
            rtMs,
            hintsUsed,
            cpaStage: state.skillStates[skill.id]?.cpaStage ?? 'concret',
            gameId: 'duel-llampec',
            retry,
            cleanDays: state.cleanDays[skill.id] ?? [],
            sessionId,
            now: clock + spent,
          },
          state.skillStates[skill.id],
          state.factStates,
          factsForSkill(skill.id),
          `a${questions}-${retry ? 'r' : 'f'}`,
        )
        state.skillStates = { ...state.skillStates, [skill.id]: outcome.skillState }
        if (outcome.factState) state.factStates = { ...state.factStates, [outcome.factState.factKey]: outcome.factState }
        state.cleanDays = { ...state.cleanDays, [skill.id]: outcome.cleanDays }
      }

      record(first.correct, first.rtMs, 0, false)
      trace?.({ day, spent, selection, correct: first.correct, box: key ? state.factStates[key]?.box : undefined })
      questions += 1
      if (first.correct) correctFirst += 1
      results.push(first.correct)
      spent += first.rtMs + (spent < warmupEnd ? 1500 : 9000)
      if (key && first.correct) {
        const mem = state.memory.get(key)
        state.memory.set(key, { n: (mem ? fade(learner, mem, day) : 0) + 1, lastDay: day })
      }
      if (!first.correct) {
        // The app shows hints and the answer: the child gets it with help (stored, never clean) and learns a little.
        record(true, first.rtMs + 6000, 1, true)
        spent += 9000
        if (key) {
          const mem = state.memory.get(key)
          state.memory.set(key, { n: (mem ? fade(learner, mem, day) : 0) + 0.4, lastDay: day })
        }
        if (key) queue = [...queue, { afterN: counter + 3, selection }]
      }
      if (key && !followUp) {
        const ops = skill.operation
        const commutative = (ops === 'add' || ops === 'mul') && key.match(/^(add|mul):(\d+)[+x](\d+)$/)
        const shown = commutative ? { shownOrder: 'asc' as const } : {}
        queue = [
          ...queue,
          ...planFamilyPartners({
            factKey: key,
            familyOf: factFamily,
            ownerOf: factOwner,
            skills: MATES_SKILLS,
            skillStates: state.skillStates,
            factStates: state.factStates,
            recent: results,
            counter,
            queued: queue,
            now: clock + spent,
            history,
            rng,
            ...shown,
          }),
        ]
      }
    }

    for (const op of OPERATION_IDS) if (dayMastered[op] === undefined && isMasteredOp(state.skillStates, op)) dayMastered[op] = day
    if (stopWhenAllMastered && dayMastered.div !== undefined) break
  }

  return {
    dayMastered,
    accuracy: questions === 0 ? 0 : correctFirst / questions,
    questions,
    coreShare: coreCounted === 0 ? 0 : coreQuestions / coreCounted,
    maxInFlight,
    skillStates: state.skillStates,
    factStates: state.factStates,
  }
}
