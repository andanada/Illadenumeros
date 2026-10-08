import { useEffect, useState } from 'react'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { Button } from '../../ui/Button'
import { ChoiceRow } from '../shared/ChoiceRow'
import { FeedbackBar } from '../shared/FeedbackBar'
import { NextButton } from '../shared/NextButton'
import { usePrefersReducedMotion } from '../shared/speed/usePrefersReducedMotion'
import { PlainRound } from '../shared/tables/PlainRound'
import { isTrivial, levelOf, tableFactOf, type TableFact } from '../shared/tables/tableFact'
import type { RoundProps } from '../shared/useGameBase'
import { useRoundAnswer } from '../shared/useRoundAnswer'
import { Garden } from './Garden'
import { buttonLabel, gardenCaption, gardenPlan, plantedCount, questionLine, stepsNeeded } from './gardenLogic'

function GardenBoard({ flow, rounds, onNext, fact }: RoundProps & { fact: TableFact }) {
  const { item } = flow
  const plan = gardenPlan(fact)
  const needed = stepsNeeded(plan)
  const level = levelOf(item.cpaStage)
  const [step, setStep] = useState(0)
  const [requested, setRequested] = useState(false)
  const reduced = usePrefersReducedMotion()
  const { feedback, done, answer } = useRoundAnswer(flow, rounds)

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])

  const hidden = level === 3 && !requested && flow.hintLevel < 2
  const solution = flow.hintLevel === 3
  const shown = solution ? needed : step
  const built = shown >= needed
  const showChoices = hidden || built
  // Level 1 reads the running total aloud; later levels leave the multiplying to the child.
  const caption = gardenCaption(plan, shown, level === 1 || flow.hintLevel >= 1)

  const plant = (): void => {
    unlockAudio()
    sfx.pop()
    setStep((n) => Math.min(needed, n + 1))
  }
  const label = `Jardí amb ${plantedCount(plan, shown)} flors: ${caption}`

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-5xl font-bold tracking-tight text-brand-dark" data-testid="question-text">
        {item.text}
      </p>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-2">
        {hidden ? (
          <Button
            variant="soft"
            tilt={-2}
            onClick={() => {
              flow.markHint()
              setRequested(true)
            }}
          >
            Mostra el jardí
          </Button>
        ) : (
          <>
            <Garden plan={plan} step={shown} reduced={reduced} label={label} />
            <p aria-live="polite" className="sticker rounded-full bg-white px-5 py-1 text-2xl font-bold text-brand-dark">
              {caption}
            </p>
            {!built && (
              <Button variant="primary" big tilt={1} onClick={plant}>
                {buttonLabel(plan)}
              </Button>
            )}
          </>
        )}
        {showChoices && <ChoiceRow choices={item.choices} wrongValues={flow.wrongValues} disabled={done} onPick={(c) => void answer(c)} />}
      </div>
      <FeedbackBar
        mood={feedback?.mood ?? 'pensa'}
        tone={feedback?.tone ?? 'neutral'}
        message={feedback?.text ?? (built || hidden ? questionLine(fact) : caption)}
        action={done ? <NextButton last={rounds.finished} onClick={onNext} /> : undefined}
      />
    </div>
  )
}

/** One "Jardí d'Arrays" question, remounted per item (key = item.id). */
export function JardiArraysRound(props: RoundProps) {
  const fact = tableFactOf(props.flow.item)
  if (!fact || isTrivial(fact)) return <PlainRound {...props} />
  return <GardenBoard {...props} fact={fact} />
}
