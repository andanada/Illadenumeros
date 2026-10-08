import { useCallback, useMemo, useState } from 'react'
import { matesAmbit } from '../../../ambits/mates'
import type { Choice, GameId, Item, SkillNode } from '../../../core/ambit/types'
import { medianRt } from '../../../core/engine/leitner'
import type { AnswerOutcome } from '../../../core/progress/applyAnswer'
import { useProgress } from '../../../core/progress/store'
import { createRng } from '../../../core/rng'
import { paceMs } from './pace'
import { planRoundFacts, type PlannedFact } from './speedPlan'

const REFILL = 12
const REQUEUE_GAP = 3
/** Two wrong taps leave only the right one among three; four choices allow three tries. */
const revealAfter = (item: Item): number => (item.choices.length <= 3 ? 2 : 3)

export interface SubmitResult {
  correct: boolean
  /** True when the question is over: right answer, or the solution was shown after several tries. */
  itemDone: boolean
  /** Solved at the first try with no help. */
  clean: boolean
  outcome?: AnswerOutcome
}

export interface SpeedQuestions {
  item: Item
  planned: PlannedFact
  skill: SkillNode
  /** Personal target pace for this fact. */
  pace: number
  /** Values already tried wrongly on this question. */
  wrongValues: readonly string[]
  /** Records the answer through the normal store (Leitner, fluency, petals). `rtMs` excludes pauses. */
  submit: (choice: Choice, rtMs: number) => Promise<SubmitResult>
  /** Moves to the next planned fact. */
  advance: () => void
  /** The target swam away: the same fact comes back a few questions later. */
  requeueAndAdvance: () => void
}

interface Options {
  gameId: GameId
  operation: { readonly skillIds: readonly string[] }
  skillIds: readonly string[] | undefined
}

/** Plans a round with `planRoundFacts` and serves its questions one by one; answers go through `record`. */
export function useSpeedQuestions({ gameId, operation, skillIds }: Options): SpeedQuestions {
  const record = useProgress((s) => s.record)
  const [seed] = useState(() => `${Date.now()}`)

  const plan = useCallback(
    (round: number): PlannedFact[] => {
      const state = useProgress.getState()
      return planRoundFacts({
        operation,
        skills: matesAmbit.skills,
        skillStates: state.skillStates,
        factStates: state.factStates,
        factsForSkill: matesAmbit.factsForSkill,
        ...(skillIds ? { restrictTo: skillIds } : {}),
        count: REFILL,
        rng: createRng(`speed:${seed}:${round}`),
      })
    },
    [operation, seed, skillIds],
  )

  const [queue, setQueue] = useState<PlannedFact[]>(() => plan(0))
  const [rounds, setRounds] = useState(1)
  const [cursor, setCursor] = useState(0)
  const [serial, setSerial] = useState(0)
  const [errors, setErrors] = useState(0)
  const [wrongValues, setWrongValues] = useState<string[]>([])

  const planned = queue[cursor] as PlannedFact
  const item = useMemo(() => {
    const generator = matesAmbit.generators[planned.skillId]
    if (!generator) throw new Error(`Sense generador per a ${planned.skillId}`)
    const cpaStage = useProgress.getState().skillStates[planned.skillId]?.cpaStage ?? 'concret'
    return generator({ rng: createRng(`item:${seed}:${serial}`), cpaStage, factKey: planned.factKey })
    // The serial changes with every question (also when the same fact comes back).
  }, [planned, serial, seed])

  const skill = useMemo(() => {
    const found = matesAmbit.skills.find((s) => s.id === planned.skillId)
    if (!found) throw new Error(`Habilitat desconeguda ${planned.skillId}`)
    return found
  }, [planned.skillId])

  const factState = useProgress((s) => s.factStates[planned.factKey])
  const pace = paceMs(factState ? medianRt(factState) : undefined, skill.fluencyTargetMs)

  const submit = useCallback(
    async (choice: Choice, rtMs: number): Promise<SubmitResult> => {
      const correct = choice.value === item.answer
      const nextErrors = correct ? errors : errors + 1
      const revealed = !correct && nextErrors >= revealAfter(item)
      let outcome: AnswerOutcome | undefined
      try {
        outcome = await record({
          skillId: item.skillId,
          ...(item.factKey !== undefined ? { factKey: item.factKey } : {}),
          correct,
          rtMs,
          hintsUsed: Math.min(nextErrors, 3),
          retry: errors > 0,
          ...(choice.misconception !== undefined ? { misconception: choice.misconception } : {}),
          cpaStage: item.cpaStage,
          gameId,
        })
      } catch {
        // Progress could not be saved (e.g. nobody selected): the child keeps playing.
        outcome = undefined
      }
      if (!correct) {
        setErrors(nextErrors)
        setWrongValues((v) => [...v, choice.value])
      }
      return { correct, itemDone: correct || revealed, clean: correct && errors === 0, ...(outcome ? { outcome } : {}) }
    },
    [errors, gameId, item, record],
  )

  const move = useCallback(
    (requeue: boolean) => {
      const next = cursor + 1
      let list = queue
      if (requeue) {
        const at = Math.min(next + REQUEUE_GAP, list.length)
        list = [...list.slice(0, at), planned, ...list.slice(at)]
      }
      if (next >= list.length - 2) {
        list = [...list, ...plan(rounds)]
        setRounds(rounds + 1)
      }
      setQueue(list)
      setCursor(next)
      setSerial((n) => n + 1)
      setErrors(0)
      setWrongValues([])
    },
    [cursor, plan, planned, queue, rounds],
  )

  const advance = useCallback(() => move(false), [move])
  const requeueAndAdvance = useCallback(() => move(true), [move])

  return { item, planned, skill, pace, wrongValues, submit, advance, requeueAndAdvance }
}
