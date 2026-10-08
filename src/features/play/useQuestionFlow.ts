import { useCallback, useMemo, useRef, useState } from 'react'
import { matesAmbit } from '../../ambits/mates'
import type { Choice, GameId, Item, SkillNode } from '../../core/ambit/types'
import { softenedStage } from '../../core/engine/cpa'
import { isFollowUpStillValid, planFamilyPartners, type QueuedSelection } from '../../core/engine/family'
import { selectNext, type Selection } from '../../core/engine/sessionSelector'
import { MASTERY_THRESHOLDS } from '../../core/engine/thresholds'
import { parseFactKey } from '../../ambits/mates/generators/itemFactory'
import { useProgress, type RecordInput } from '../../core/progress/store'
import { createRng } from '../../core/rng'
import type { AnswerOutcome } from '../../core/progress/applyAnswer'

/** Hint ladder: 0 = none, 1 = visual cue, 2 = strategy, 3 = full solution shown. */
export type HintLevel = 0 | 1 | 2 | 3

export interface AnswerResult {
  correct: boolean
  /** True when the item is finished (correct, or solution revealed after 3 errors). */
  itemDone: boolean
  outcome?: AnswerOutcome
}

export interface QuestionFlow {
  item: Item
  skill: SkillNode
  hintLevel: HintLevel
  /** Wrong answers on the current item (0..3). */
  errors: number
  /** Choice values already tried wrongly on this item (to grey them out). */
  wrongValues: string[]
  streak: number
  answered: number
  correctCount: number
  /** Answers the current item. `rtMs` defaults to the time since the item appeared. */
  answer: (choice: Choice, rtMs?: number) => Promise<AnswerResult>
  /** Moves to the next item. Items answered with help come back 2-3 questions later. */
  next: () => void
  /** Marks that the child asked for help herself (e.g. showing the frame), without any error. */
  markHint: () => void
}

export interface FlowOptions {
  gameId: GameId
  /** Skills the game can show (intersected with what the child has unlocked). */
  skillIds?: readonly string[]
  /** Fixed target, used by the diagnostic. */
  forced?: { skillId: string; factKey?: string }
}

const REQUEUE_AFTER = 3

/** Wrong answers after which the solution is shown: with few choices, two wrong ones leave only the right one. */
const revealAfter = (item: Item): number => (item.choices.length <= 3 ? 2 : 3)

interface Memory {
  seed: string
  counter: number
  queue: QueuedSelection[]
  /** Questions already asked, most recent last (interleaving and family partners). */
  history: { skillId: string; factKey?: string }[]
  hintsUsed: number
  shownAt: number
}

interface Current {
  selection: Selection
  item: Item
  /** Planned follow-up (family partner, retry): it does not plan more follow-ups itself. */
  followUp: boolean
}

/** Mutable bookkeeping of the flow (not rendered), created once in a lazy initialiser. */
const createMemory = (): Memory => ({ seed: `${Date.now()}`, counter: 0, queue: [], history: [], hintsUsed: 0, shownAt: performance.now() })

function buildItem(mem: Memory, selection: Selection): Item {
  const generator = matesAmbit.generators[selection.skillId]
  if (!generator) throw new Error(`Sense generador per a ${selection.skillId}`)
  const state = useProgress.getState()
  mem.counter += 1
  const rng = createRng(`${mem.seed}:${mem.counter}`)
  // Struggling (under 70 % in the last 10): the same question, one stage more visual.
  const cpaStage = softenedStage(state.skillStates[selection.skillId]?.cpaStage ?? 'concret', state.sessionResults)
  return generator({
    rng,
    cpaStage,
    ...(selection.factKey !== undefined ? { factKey: selection.factKey } : {}),
    ...(selection.order !== undefined ? { order: selection.order } : {}),
  })
}

/** The duel is the fluency warm-up: it only asks facts already seen on at least two spaced days (box 2+), when there are any. */
const warmupBox = (gameId: GameId): number | undefined => (gameId === 'duel-llampec' ? MASTERY_THRESHOLDS.mission.warmupMinBox : undefined)

function pickSelection(mem: Memory, options: Pick<FlowOptions, 'gameId' | 'skillIds' | 'forced'>): { selection: Selection; followUp: boolean } {
  const { forced, skillIds, gameId } = options
  if (forced) return { selection: { skillId: forced.skillId, mode: 'consolidacio', ...(forced.factKey ? { factKey: forced.factKey } : {}) }, followUp: false }
  const stateNow = useProgress.getState()
  const valid = { skills: matesAmbit.skills, factStates: stateNow.factStates, factsForSkill: matesAmbit.factsForSkill }
  // An unseen partner that no longer fits the "3 new facts at once" limit is dropped.
  mem.queue = mem.queue.filter((q) => isFollowUpStillValid(q, valid))
  const due = mem.queue.find((q) => q.afterN <= mem.counter)
  if (due) {
    mem.queue = mem.queue.filter((q) => q !== due)
    mem.history.push({ skillId: due.selection.skillId, ...(due.selection.factKey ? { factKey: due.selection.factKey } : {}) })
    return { selection: due.selection, followUp: true }
  }
  const state = useProgress.getState()
  const minBox = warmupBox(gameId)
  const picked = selectNext({
    skills: matesAmbit.skills,
    skillStates: state.skillStates,
    factStates: state.factStates,
    factsForSkill: matesAmbit.factsForSkill,
    recent: state.sessionResults,
    now: Date.now(),
    rng: createRng(`sel:${mem.seed}:${mem.counter}`),
    history: mem.history,
    ...(minBox !== undefined ? { minBox } : {}),
    ...(skillIds ? { restrictTo: skillIds } : {}),
  })
  mem.history.push({ skillId: picked.skillId, ...(picked.factKey ? { factKey: picked.factKey } : {}) })
  return { selection: picked, followUp: false }
}

/** After a fact is done, its family partners (and its commutative twin in the other order) come back a few questions later. */
function queueFamily(mem: Memory, item: Item, skillIds: readonly string[] | undefined): void {
  if (item.factKey === undefined) return
  const state = useProgress.getState()
  const fact = parseFactKey(item.factKey)
  const ops = item.operands
  const commutative = (fact?.kind === 'add' || fact?.kind === 'mul') && ops !== undefined && ops.a !== ops.b
  const plan = planFamilyPartners({
    factKey: item.factKey,
    familyOf: matesAmbit.factFamily ?? (() => []),
    ownerOf: matesAmbit.factOwner ?? (() => undefined),
    skills: matesAmbit.skills,
    skillStates: state.skillStates,
    factStates: state.factStates,
    recent: state.sessionResults,
    counter: mem.counter,
    queued: mem.queue,
    now: Date.now(),
    history: mem.history,
    rng: createRng(`fam:${mem.seed}:${mem.counter}`),
    ...(commutative && ops ? { shownOrder: ops.a <= ops.b ? ('asc' as const) : ('desc' as const) } : {}),
    ...(skillIds ? { restrictTo: skillIds } : {}),
  })
  mem.queue = [...mem.queue, ...plan]
}

/**
 * One question at a time, driven by the spaced-repetition selector.
 * Handles the three-step hint ladder: no punishment, the solution is shown after 3 errors.
 */
export function useQuestionFlow(options: FlowOptions): QuestionFlow {
  const { skillIds, forced, gameId } = options
  const record = useProgress((s) => s.record)
  const [start] = useState<{ mem: Memory; first: Current }>(() => {
    const mem = createMemory()
    const { selection, followUp } = pickSelection(mem, options)
    return { mem, first: { selection, item: buildItem(mem, selection), followUp } }
  })
  // Bookkeeping lives in a ref, read only inside handlers; the lazy initialiser above built the first item.
  const memory = useRef(start.mem)
  const [current, setCurrent] = useState<Current>(start.first)
  const [errors, setErrors] = useState(0)
  const [wrongValues, setWrongValues] = useState<string[]>([])
  const [streak, setStreak] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  const skill = useMemo(() => {
    const found = matesAmbit.skills.find((s) => s.id === current.item.skillId)
    if (!found) throw new Error(`Habilitat desconeguda ${current.item.skillId}`)
    return found
  }, [current.item.skillId])

  const answer = useCallback(
    async (choice: Choice, rtMs?: number): Promise<AnswerResult> => {
      const correct = choice.value === current.item.answer
      const elapsed = rtMs ?? performance.now() - memory.current.shownAt
      const nextErrors = correct ? errors : errors + 1
      const revealed = !correct && nextErrors >= revealAfter(current.item)
      memory.current.hintsUsed = Math.max(memory.current.hintsUsed, correct ? memory.current.hintsUsed : Math.min(nextErrors, 3))

      const input: RecordInput = {
        skillId: current.item.skillId,
        ...(current.item.factKey !== undefined ? { factKey: current.item.factKey } : {}),
        correct,
        rtMs: elapsed,
        hintsUsed: memory.current.hintsUsed,
        retry: errors > 0,
        ...(choice.misconception !== undefined ? { misconception: choice.misconception } : {}),
        cpaStage: current.item.cpaStage,
        gameId,
      }
      const outcome = await record(input)

      setAnswered((n) => n + 1)
      if (correct) {
        setCorrectCount((n) => n + 1)
        setStreak((n) => n + 1)
      } else {
        setStreak(0)
        setErrors(nextErrors)
        setWrongValues((v) => [...v, choice.value])
      }
      const itemDone = correct || revealed
      const alreadyQueued = memory.current.queue.some((q) => q.selection === current.selection)
      if (itemDone && (memory.current.hintsUsed > 0 || revealed) && !alreadyQueued) {
        memory.current.queue.push({ afterN: memory.current.counter + REQUEUE_AFTER, selection: current.selection })
      }
      if (itemDone && !forced && !current.followUp) queueFamily(memory.current, current.item, skillIds)
      return { correct, itemDone, outcome }
    },
    [current, errors, gameId, record, forced, skillIds],
  )

  const next = useCallback(() => {
    const { selection, followUp } = pickSelection(memory.current, { gameId, skillIds, forced })
    setCurrent({ selection, item: buildItem(memory.current, selection), followUp })
    setErrors(0)
    setWrongValues([])
    memory.current.hintsUsed = 0
    memory.current.shownAt = performance.now()
  }, [forced, skillIds, gameId])

  const markHint = useCallback(() => {
    memory.current.hintsUsed = Math.max(memory.current.hintsUsed, 1)
  }, [])

  const hintLevel = (errors >= revealAfter(current.item) ? 3 : Math.min(errors, 3)) as HintLevel
  return { item: current.item, skill, hintLevel, errors, wrongValues, streak, answered, correctCount, answer, next, markHint }
}
