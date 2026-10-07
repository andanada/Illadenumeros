import { useCallback, useState } from 'react'
import type { Choice } from '../../core/ambit/types'
import { sfx } from '../../core/audio/sfx'
import type { QuestionFlow } from '../../features/play/useQuestionFlow'
import type { GameRounds } from './useGameRounds'

export interface RoundFeedback {
  text: string
  tone: 'ok' | 'almost'
  mood: 'content' | 'anims' | 'balla'
}

export interface RoundAnswer {
  feedback: RoundFeedback | null
  /** True once the item is finished (right answer or solution revealed). */
  done: boolean
  /** Replaces the feedback bubble (e.g. instructions after a game-specific action). */
  setFeedback: (feedback: RoundFeedback | null) => void
  answer: (choice: Choice) => Promise<void>
}

/** Shared answering step for the interactive games: flow.answer + round tally + kind feedback. */
export function useRoundAnswer(flow: QuestionFlow, rounds: GameRounds): RoundAnswer {
  const [feedback, setFeedback] = useState<RoundFeedback | null>(null)
  const [done, setDone] = useState(false)
  const { item } = flow
  const { register } = rounds

  const answer = useCallback(
    async (choice: Choice): Promise<void> => {
      const errorsBefore = flow.errors
      const result = await flow.answer(choice)
      register(result, errorsBefore)
      if (result.correct) {
        sfx.star()
        setFeedback({ tone: 'ok', mood: 'balla', text: `Molt bé! ${item.text.replace('?', item.answer)}` })
        setDone(true)
      } else if (result.itemDone) {
        setFeedback({ tone: 'almost', mood: 'anims', text: item.hints[2] })
        setDone(true)
      } else {
        sfx.almost()
        setFeedback({ tone: 'almost', mood: 'anims', text: `Gairebé! ${item.hints[Math.min(errorsBefore, 1)]}` })
      }
    },
    [flow, item, register],
  )

  return { feedback, done, setFeedback, answer }
}
