import { useCallback, useMemo, useRef, useState } from 'react'
import { matesAmbit } from '../../ambits/mates'
import type { Choice, GameId, Item, SkillNode } from '../../core/ambit/types'
import { selectNext, type Selection } from '../../core/engine/sessionSelector'
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

/**
 * One question at a time, driven by the spaced-repetition selector.
 * Handles the three-step hint ladder: no punishment, the solution is shown after 3 errors.
 */
export function useQuestionFlow(options: FlowOptions): QuestionFlow {
  const { skillIds, forced, gameId } = options
  const record = useProgress((s) => s.record)
  const seed = useRef(`${Date.now()}`)
  const counter = useRef(0)
  const queue = useRef<{ afterN: number; selection: Selection }[]>([])
  const shownAt = useRef(performance.now())

  const build = useCallback(
    (selection: Selection): Item => {
      const generator = matesAmbit.generators[selection.skillId]
      if (!generator) throw new Error(`Sense generador per a ${selection.skillId}`)
      const state = useProgress.getState()
      counter.current += 1
      const rng = createRng(`${seed.current}:${counter.current}`)
      const cpaStage = state.skillStates[selection.skillId]?.cpaStage ?? 'concret'
      return generator({ rng, cpaStage, ...(selection.factKey !== undefined ? { factKey: selection.factKey } : {}) })
    },
    [],
  )

  const pick = useCallback((): Selection => {
    if (forced) return { skillId: forced.skillId, mode: 'consolidacio', ...(forced.factKey ? { factKey: forced.factKey } : {}) }
    const due = queue.current.find((q) => q.afterN <= counter.current)
    if (due) {
      queue.current = queue.current.filter((q) => q !== due)
      return due.selection
    }
    const state = useProgress.getState()
    return selectNext({
      skills: matesAmbit.skills,
      skillStates: state.skillStates,
      factStates: state.factStates,
      factsForSkill: matesAmbit.factsForSkill,
      recent: state.sessionResults,
      now: Date.now(),
      rng: createRng(`sel:${seed.current}:${counter.current}`),
      ...(skillIds ? { restrictTo: skillIds } : {}),
    })
  }, [forced, skillIds])

  const [current, setCurrent] = useState<{ selection: Selection; item: Item }>(() => {
    const selection = pick()
    return { selection, item: build(selection) }
  })
  const [errors, setErrors] = useState(0)
  const [wrongValues, setWrongValues] = useState<string[]>([])
  const [streak, setStreak] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const hintsUsed = useRef(0)

  const skill = useMemo(() => {
    const found = matesAmbit.skills.find((s) => s.id === current.item.skillId)
    if (!found) throw new Error(`Habilitat desconeguda ${current.item.skillId}`)
    return found
  }, [current.item.skillId])

  const answer = useCallback(
    async (choice: Choice, rtMs?: number): Promise<AnswerResult> => {
      const correct = choice.value === current.item.answer
      const elapsed = rtMs ?? performance.now() - shownAt.current
      const nextErrors = correct ? errors : errors + 1
      const revealed = !correct && nextErrors >= revealAfter(current.item)
      hintsUsed.current = Math.max(hintsUsed.current, correct ? hintsUsed.current : Math.min(nextErrors, 3))

      const input: RecordInput = {
        skillId: current.item.skillId,
        ...(current.item.factKey !== undefined ? { factKey: current.item.factKey } : {}),
        correct,
        rtMs: elapsed,
        hintsUsed: hintsUsed.current,
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
      const alreadyQueued = queue.current.some((q) => q.selection === current.selection)
      if (itemDone && (hintsUsed.current > 0 || revealed) && !alreadyQueued) {
        queue.current.push({ afterN: counter.current + REQUEUE_AFTER, selection: current.selection })
      }
      return { correct, itemDone, outcome }
    },
    [current, errors, gameId, record],
  )

  const next = useCallback(() => {
    const selection = pick()
    setCurrent({ selection, item: build(selection) })
    setErrors(0)
    setWrongValues([])
    hintsUsed.current = 0
    shownAt.current = performance.now()
  }, [build, pick])

  const markHint = useCallback(() => {
    hintsUsed.current = Math.max(hintsUsed.current, 1)
  }, [])

  const hintLevel = (errors >= revealAfter(current.item) ? 3 : Math.min(errors, 3)) as HintLevel
  return { item: current.item, skill, hintLevel, errors, wrongValues, streak, answered, correctCount, answer, next, markHint }
}
