import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useEffect, useMemo, useState } from 'react'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { Button } from '../../ui/Button'
import { Candy } from '../../ui/visual/Treats'
import { VisualModelView } from '../../ui/visual/VisualModelView'
import { ChoiceRow } from '../shared/ChoiceRow'
import { FeedbackBar } from '../shared/FeedbackBar'
import { NextButton } from '../shared/NextButton'
import { useRoundAnswer } from '../shared/useRoundAnswer'
import type { RoundProps } from '../shared/useGameBase'
import { canDeal, dealCaption, dealTo, emptyPlates, fullPlates, isShared, nextPlate, planFromItem, remainingCandies } from './plateLogic'
import { CandyPool, PlatesBoard } from './PlatesBoard'
import { parsePlateId } from './plateIds'

/** One "Repartim Llaminadures" question, remounted per item (key = item.id). */
export function LlaminadureRound({ flow, rounds, onNext }: RoundProps) {
  const { item } = flow
  const plan = useMemo(() => planFromItem(item), [item])
  const stage = item.cpaStage
  const deal = plan.mode === 'deal' ? plan : undefined
  const prefilled = stage !== 'concret'
  const [plates, setPlates] = useState<readonly number[]>(() => (deal ? (prefilled ? fullPlates(deal.total, deal.groups) : emptyPlates(deal.groups)) : []))
  const [requested, setRequested] = useState(false)
  const [dragging, setDragging] = useState(false)
  const { feedback, done, setFeedback, answer } = useRoundAnswer(flow, rounds)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])

  const solution = flow.hintLevel === 3
  const shownPlates = deal && solution ? fullPlates(deal.total, deal.groups) : plates
  const hidden = deal !== undefined && stage === 'abstracte' && !requested && flow.hintLevel < 2
  const shared = deal ? isShared(shownPlates, deal.total) : true
  const showChoices = !deal || hidden || shared

  const giveTo = (index: number): void => {
    if (!deal) return
    unlockAudio()
    if (isShared(plates, deal.total)) return
    if (!canDeal(plates, index)) {
      sfx.almost()
      setFeedback({ tone: 'almost', mood: 'anims', text: 'Un a cada plat! Prova en un altre plat' })
      return
    }
    sfx.pop()
    setFeedback(null)
    setPlates((current) => dealTo(current, index, deal.total))
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    setDragging(false)
    const index = event.over ? parsePlateId(event.over.id) : undefined
    if (index !== undefined) giveTo(index)
  }

  const message = feedback?.text ?? (deal ? (shared ? dealCaption(shownPlates, deal.total) + '. Quina és la resposta?' : 'Reparteix les llaminadures: una a cada plat') : 'Mira bé i tria la resposta')

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-5xl font-bold tracking-tight text-brand-dark">{item.text}</p>
      <DndContext sensors={sensors} onDragStart={() => setDragging(true)} onDragEnd={handleDragEnd} onDragCancel={() => setDragging(false)}>
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
              Mostra els plats
            </Button>
          )}
          {deal && !hidden && (
            <>
              <PlatesBoard plates={shownPlates} dragging={dragging} onTap={giveTo} />
              <p aria-live="polite" className="sticker rounded-full bg-white px-5 py-1 text-xl font-bold text-brand-dark">
                {dealCaption(shownPlates, deal.total)}
              </p>
              <CandyPool remaining={remainingCandies(shownPlates, deal.total)} shared={shared} onDeal={() => giveTo(nextPlate(plates))} />
            </>
          )}
          {!deal && <VisualModelView key={item.id} model={item.visual} size="md" />}
          {!deal && flow.hintLevel >= 1 && item.hintVisual.kind !== 'none' && <VisualModelView model={item.hintVisual} size="sm" animate={flow.hintLevel === 1} />}
          {showChoices && <ChoiceRow choices={item.choices} wrongValues={flow.wrongValues} disabled={done} onPick={(c) => void answer(c)} />}
        </div>
        <DragOverlay>{dragging ? <Candy size={64} tone={0} /> : null}</DragOverlay>
      </DndContext>
      <FeedbackBar
        mood={feedback?.mood ?? 'pensa'}
        tone={feedback?.tone ?? 'neutral'}
        message={message}
        action={done ? <NextButton last={rounds.finished} onClick={onNext} /> : undefined}
      />
    </div>
  )
}
