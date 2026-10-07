import { useEffect, useState } from 'react'
import type { Choice } from '../../core/ambit/types'
import { sfx } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { ChoiceRow } from '../shared/ChoiceRow'
import { FeedbackBar } from '../shared/FeedbackBar'
import { NextButton } from '../shared/NextButton'
import type { RoundProps } from '../shared/useGameBase'
import { ReadLine } from './ReadLine'

export interface ReadRoundProps extends RoundProps {
  from: number
  to: number
  target: number
}

/** B2: read the number the arrow points at, answering with big choice stickers. */
export function ReadRound({ flow, rounds, onNext, from, to, target }: ReadRoundProps) {
  const { item } = flow
  const [done, setDone] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; tone: 'ok' | 'almost' } | null>(null)

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])

  const handleChoice = async (choice: Choice): Promise<void> => {
    const errorsBefore = flow.errors
    const result = await flow.answer(choice)
    rounds.register(result, errorsBefore)
    if (result.correct) {
      sfx.star()
      setDone(true)
      setFeedback({ tone: 'ok', text: `Sí! La fletxa és al ${target}.` })
    } else if (result.itemDone) {
      setDone(true)
      setFeedback({ tone: 'almost', text: item.hints[2] })
    } else {
      sfx.almost()
      setFeedback({ tone: 'almost', text: `Gairebé! ${item.hints[Math.min(errorsBefore, 1)]}` })
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-4xl font-bold tracking-tight text-brand-dark">{item.text}</p>
      <div className="flex flex-1 flex-col justify-center">
        <ReadLine from={from} to={to} target={target} labelAll={flow.hintLevel >= 1} revealed={done} />
        <ChoiceRow choices={item.choices} wrongValues={flow.wrongValues} disabled={done} onPick={(c) => void handleChoice(c)} />
      </div>
      <FeedbackBar
        mood={done ? 'balla' : feedback ? 'anims' : 'pensa'}
        tone={feedback?.tone ?? 'neutral'}
        message={feedback?.text ?? 'Compta les ratlletes des del número de l’esquerra.'}
        action={done ? <NextButton last={rounds.finished} onClick={onNext} /> : undefined}
      />
    </div>
  )
}
