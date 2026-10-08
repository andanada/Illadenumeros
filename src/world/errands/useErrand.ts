import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Choice, GameId, Item } from '../../core/ambit/types'
import { speak } from '../../core/audio/speech'
import { useQuestionFlow, type HintLevel, type QuestionFlow } from '../../features/play/useQuestionFlow'
import { worldSfx } from '../scene/worldSfx'
import { pickAdapter } from './adapters'
import { fallbackRequest } from './requestText'
import type { AnyErrandAdapter, BuiltTask, ErrandPhase } from './types'

export interface ErrandOptions {
  gameId: GameId
  skillIds: readonly string[]
  adapters: readonly AnyErrandAdapter[]
  /** Fixed target (tests, and later the arrival diagnostic). */
  forced?: { skillId: string; factKey?: string }
  /** Called once per solved errand with the coins it earned (petals of the recorded answer). */
  onSolved?: (coins: number) => void
}

export interface Errand {
  flow: QuestionFlow
  item: Item
  /** Undefined = no adapter: the choices are played as in-world tokens. */
  task: BuiltTask | undefined
  request: { text: string; speech: string }
  phase: ErrandPhase
  /** Changes with every new neighbour (their look and name). */
  visit: number
  /** Hint ladder level shown: errors, or the child's own "help" request. */
  hintLevel: HintLevel
  hintText: string | undefined
  /** Wrong tries on this item (pieces bounce back each time). */
  tries: number
  earned: number
  submit: (choice: Choice) => Promise<void>
  askHelp: () => void
  /** The neighbour leaves and the next one comes in. */
  next: () => void
}

const THANKS = ['Moltes gràcies!', 'Perfecte, gràcies!', 'Genial! Fins aviat!', 'Que bé! Gràcies!'] as const

/** One neighbour at a time, each with the engine's next item, solved in the world. */
export function useErrand(options: ErrandOptions): Errand {
  const { gameId, skillIds, adapters, forced, onSolved } = options
  const flow = useQuestionFlow({ gameId, skillIds, ...(forced ? { forced } : {}) })
  const { item } = flow
  const [phase, setPhase] = useState<ErrandPhase>('asking')
  const [visit, setVisit] = useState(0)
  const [selfHelp, setSelfHelp] = useState<HintLevel>(0)
  const [earned, setEarned] = useState(0)
  const busy = useRef(false)

  const task = useMemo(() => pickAdapter(adapters, item)?.build(item), [adapters, item])
  const request = task?.request ?? fallbackRequest(item)

  useEffect(() => {
    speak(request.speech)
    // Only when a new item arrives, not when the request object is rebuilt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  const hintLevel = Math.max(flow.hintLevel, selfHelp) as HintLevel
  const hintText = hintLevel === 0 ? undefined : item.hints[hintLevel - 1]

  const submit = useCallback(
    async (choice: Choice): Promise<void> => {
      if (busy.current || phase !== 'asking') return
      busy.current = true
      setPhase('checking')
      try {
        const result = await flow.answer(choice)
        if (result.correct) {
          const coins = result.outcome?.petals ?? 0
          worldSfx.happy()
          setEarned(coins)
          setPhase('thanks')
          speak(THANKS[visit % THANKS.length] ?? THANKS[0])
          onSolved?.(coins)
        } else if (result.itemDone) {
          setPhase('shown')
          speak(item.hints[2])
        } else {
          worldSfx.almost()
          setPhase('asking')
          speak(item.hints[Math.min(flow.errors, 1)] ?? item.hints[0])
        }
      } catch {
        // Recording failed (player switched): the neighbour simply waits for another try.
        setPhase('asking')
      } finally {
        busy.current = false
      }
    },
    [flow, phase, visit, item.hints, onSolved],
  )

  const askHelp = useCallback(() => {
    flow.markHint()
    const level = Math.min(3, Math.max(hintLevel, 0) + 1) as HintLevel
    const capped = (level === 3 ? 2 : level) as HintLevel
    setSelfHelp(capped)
    speak(item.hints[capped - 1] ?? item.hints[0])
  }, [flow, hintLevel, item.hints])

  const next = useCallback(() => {
    flow.next()
    setPhase('asking')
    setSelfHelp(0)
    setEarned(0)
    setVisit((v) => v + 1)
  }, [flow])

  return { flow, item, task, request, phase, visit, hintLevel, hintText, tries: flow.errors, earned, submit, askHelp, next }
}
