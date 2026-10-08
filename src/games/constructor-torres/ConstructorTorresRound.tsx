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
import { Tower } from './Tower'
import { blocksAfter, floorCaption, floorsToBuild, isBuilt, questionLine, sumTape, towerPlan } from './towerLogic'

function TowerBoard({ flow, rounds, onNext, fact }: RoundProps & { fact: TableFact }) {
  const { item } = flow
  const plan = towerPlan(fact)
  const level = levelOf(item.cpaStage)
  const [built, setBuilt] = useState(0)
  const [requested, setRequested] = useState(false)
  const reduced = usePrefersReducedMotion()
  const { feedback, done, answer } = useRoundAnswer(flow, rounds)

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])

  const hidden = level === 3 && !requested && flow.hintLevel < 2
  const solution = flow.hintLevel === 3
  const shown = solution ? floorsToBuild(plan) : built
  const complete = isBuilt(plan, shown)
  const showChoices = hidden || complete
  // Level 1 adds the running total to the repeated addition; later levels leave it to the child.
  const tape = sumTape(plan, shown, plan.kind === 'mul' && (level === 1 || flow.hintLevel >= 1))
  const caption = floorCaption(plan, shown)

  const add = (): void => {
    unlockAudio()
    sfx.pop()
    setBuilt((n) => Math.min(floorsToBuild(plan), n + 1))
  }
  const remove = (): void => {
    unlockAudio()
    sfx.tap()
    setBuilt((n) => Math.max(0, n - 1))
  }
  const label = `Torre de ${shown} plantes de ${plan.size} blocs, ${blocksAfter(plan, shown)} blocs en total`

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
            Mostra la torre
          </Button>
        ) : (
          <>
            <Tower plan={plan} built={shown} reduced={reduced} label={label} />
            <p aria-live="polite" className="sticker rounded-full bg-white px-5 py-1 text-2xl font-bold text-brand-dark">
              {plan.kind === 'mul' || level === 1 ? tape : caption}
            </p>
            {!complete && (
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="primary" big tilt={1} onClick={add}>
                  Afegeix una planta
                </Button>
                {built > 0 && (
                  <Button variant="soft" tilt={-1} onClick={remove}>
                    Treu l’última
                  </Button>
                )}
              </div>
            )}
          </>
        )}
        {showChoices && <ChoiceRow choices={item.choices} wrongValues={flow.wrongValues} disabled={done} onPick={(c) => void answer(c)} />}
      </div>
      <FeedbackBar
        mood={feedback?.mood ?? 'pensa'}
        tone={feedback?.tone ?? 'neutral'}
        message={feedback?.text ?? (complete || hidden ? questionLine(plan) : caption)}
        action={done ? <NextButton last={rounds.finished} onClick={onNext} /> : undefined}
      />
    </div>
  )
}

/** One "Constructor de Torres" question, remounted per item (key = item.id). */
export function ConstructorTorresRound(props: RoundProps) {
  const fact = tableFactOf(props.flow.item)
  if (!fact || isTrivial(fact)) return <PlainRound {...props} />
  return <TowerBoard {...props} fact={fact} />
}
