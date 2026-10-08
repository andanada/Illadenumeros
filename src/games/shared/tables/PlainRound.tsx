import { useEffect } from 'react'
import { speak } from '../../../core/audio/speech'
import { ChoiceRow } from '../ChoiceRow'
import { FeedbackBar } from '../FeedbackBar'
import { NextButton } from '../NextButton'
import type { RoundProps } from '../useGameBase'
import { useRoundAnswer } from '../useRoundAnswer'

/** Plain question for facts with nothing to count (×0, ×1, 0 : n): the same flow, just the answer sticker row. */
export function PlainRound({ flow, rounds, onNext }: RoundProps) {
  const { item } = flow
  const { feedback, done, answer } = useRoundAnswer(flow, rounds)
  useEffect(() => {
    speak(item.speech)
  }, [item.speech])
  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-5xl font-bold tracking-tight text-brand-dark" data-testid="question-text">
        {item.text}
      </p>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-2">
        <ChoiceRow choices={item.choices} wrongValues={flow.wrongValues} disabled={done} onPick={(c) => void answer(c)} />
      </div>
      <FeedbackBar
        mood={feedback?.mood ?? 'pensa'}
        tone={feedback?.tone ?? 'neutral'}
        message={feedback?.text ?? 'Pensa-ho i tria la resposta'}
        action={done ? <NextButton last={rounds.finished} onClick={onNext} /> : undefined}
      />
    </div>
  )
}
