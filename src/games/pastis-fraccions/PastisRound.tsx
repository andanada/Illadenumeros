import { useEffect, useMemo, useState } from 'react'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { Button } from '../../ui/Button'
import { VisualModelView } from '../../ui/visual/VisualModelView'
import { ChoiceRow } from '../shared/ChoiceRow'
import { FeedbackBar } from '../shared/FeedbackBar'
import { NextButton } from '../shared/NextButton'
import { useRoundAnswer } from '../shared/useRoundAnswer'
import type { RoundProps } from '../shared/useGameBase'
import { Cake } from './Cake'
import { GroupBoard } from './GroupBoard'
import { collectionCaption, equivalentViews, planFromItem, toggleIndex, wholeCaption, type CakePlan } from './sliceLogic'

function instruction(plan: CakePlan, built: boolean): string {
  switch (plan.mode) {
    case 'whole':
      return 'Mira el pastís i tria la part pintada'
    case 'collection':
      return built ? 'Ara tria quant és en total' : 'Reparteix les magdalenes i pinta els grups'
    case 'equivalent':
      return 'Talla els trossos i mira si la part és la mateixa'
    case 'plain':
      return 'Mira bé i tria la resposta'
  }
}

/** One "Pastís de Fraccions" question, remounted per item (key = item.id). */
export function PastisRound({ flow, rounds, onNext }: RoundProps) {
  const { item } = flow
  const plan = useMemo(() => planFromItem(item), [item])
  const stage = item.cpaStage
  const prefilled = stage !== 'concret'
  const allGroups = useMemo(() => (plan.mode === 'collection' ? Array.from({ length: plan.selected }, (_, g) => g) : []), [plan])
  const [dealt, setDealt] = useState(prefilled)
  const [picked, setPicked] = useState<readonly number[]>(prefilled ? allGroups : [])
  const [counted, setCounted] = useState<readonly number[]>([])
  const [viewIndex, setViewIndex] = useState(0)
  const [requested, setRequested] = useState(false)
  const { feedback, done, setFeedback, answer } = useRoundAnswer(flow, rounds)

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])

  const interactive = plan.mode !== 'plain'
  const hinting = flow.hintLevel >= 1
  const solution = flow.hintLevel === 3
  const hidden = stage === 'abstracte' && interactive && !requested && flow.hintLevel < 2
  const shownDealt = dealt || solution
  const shownPicked = solution ? allGroups : picked
  const built = plan.mode !== 'collection' || (shownDealt && shownPicked.length === plan.selected)
  const showChoices = !interactive || hidden || built

  const views = useMemo(() => (plan.mode === 'equivalent' ? equivalentViews(plan.parts, plan.selected) : []), [plan])
  const startIndex = Math.max(0, views.findIndex((v) => plan.mode === 'equivalent' && v.parts === plan.parts))
  const targetIndex = plan.mode === 'equivalent' && plan.targetParts !== undefined ? views.findIndex((v) => v.parts === plan.targetParts) : -1
  const currentIndex = hinting && targetIndex >= 0 ? targetIndex : views[viewIndex] ? viewIndex : startIndex
  const view = views[currentIndex]

  const deal = (): void => {
    unlockAudio()
    sfx.pop()
    setFeedback(null)
    setDealt(true)
  }
  const toggleGroup = (g: number): void => {
    unlockAudio()
    sfx.tap()
    setFeedback(null)
    setPicked((list) => toggleIndex(list, g))
  }
  const toggleSlice = (i: number): void => {
    unlockAudio()
    sfx.pop()
    setCounted((list) => toggleIndex(list, i))
  }
  const cut = (delta: 1 | -1): void => {
    unlockAudio()
    sfx.pop()
    setViewIndex(Math.min(views.length - 1, Math.max(0, currentIndex + delta)))
  }

  const caption =
    plan.mode === 'collection'
      ? collectionCaption(plan, shownDealt, shownPicked.length)
      : plan.mode === 'whole'
        ? wholeCaption(plan.parts, counted.length)
        : view
          ? `${view.selected}/${view.parts}`
          : undefined

  return (
    <div className="flex flex-1 flex-col">
      <p data-testid="question-text" className="px-2 text-center text-4xl font-bold leading-tight tracking-tight text-brand-dark sm:text-5xl">
        {item.text}
      </p>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-2">
        {hidden && (
          <Button
            variant="soft"
            tilt={-2}
            onClick={() => {
              flow.markHint()
              setRequested(true)
            }}
          >
            Mostra el pastís
          </Button>
        )}
        {!hidden && plan.mode === 'whole' && <Cake parts={plan.parts} selected={plan.selected} counted={counted} onSlice={toggleSlice} />}
        {!hidden && plan.mode === 'equivalent' && view && <Cake parts={view.parts} selected={view.selected} />}
        {!hidden && plan.mode === 'collection' && <GroupBoard total={plan.total} parts={plan.parts} dealt={shownDealt} picked={shownPicked} onGroup={toggleGroup} />}
        {!hidden && caption && (
          <p aria-live="polite" className="sticker rounded-full bg-white px-5 py-1 text-center text-2xl font-bold text-brand-dark">
            {caption}
          </p>
        )}
        {!hidden && plan.mode === 'collection' && !shownDealt && (
          <Button variant="primary" tilt={-1.5} onClick={deal}>
            Reparteix
          </Button>
        )}
        {!hidden && plan.mode === 'equivalent' && views.length > 1 && (
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="soft" tilt={-1.5} disabled={currentIndex === 0} onClick={() => cut(-1)}>
              Menys trossos
            </Button>
            <Button variant="soft" tilt={1.5} disabled={currentIndex >= views.length - 1} onClick={() => cut(1)}>
              Més trossos
            </Button>
          </div>
        )}
        {plan.mode === 'plain' && item.visual.kind !== 'none' && <VisualModelView key={item.id} model={item.visual} size="md" />}
        {hinting && plan.mode === 'plain' && item.hintVisual.kind !== 'none' && <VisualModelView model={item.hintVisual} size="sm" animate={flow.hintLevel === 1} />}
        {showChoices && <ChoiceRow choices={item.choices} wrongValues={flow.wrongValues} disabled={done} onPick={(c) => void answer(c)} />}
      </div>
      <FeedbackBar
        mood={feedback?.mood ?? 'pensa'}
        tone={feedback?.tone ?? 'neutral'}
        message={feedback?.text ?? instruction(plan, built)}
        action={done ? <NextButton last={rounds.finished} onClick={onNext} /> : undefined}
      />
    </div>
  )
}
