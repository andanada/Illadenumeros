import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useEffect, useMemo, useState } from 'react'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { Button } from '../../ui/Button'
import { Cupcake } from '../../ui/visual/Treats'
import { VisualModelView } from '../../ui/visual/VisualModelView'
import { ChoiceRow } from '../shared/ChoiceRow'
import { FeedbackBar } from '../shared/FeedbackBar'
import { NextButton } from '../shared/NextButton'
import { useRoundAnswer } from '../shared/useRoundAnswer'
import type { RoundProps } from '../shared/useGameBase'
import { BakingTray, Basket, TRAY_DROP_ID } from './BakingTray'
import { PartialsBoard } from './PartialsBoard'
import { planFromItem, splitCaption, trayCaption, type TrayPlan } from './trayLogic'

function instruction(plan: TrayPlan, built: boolean): string {
  if (plan.mode === 'array') return built ? 'Quantes magdalenes hi ha en total?' : `Posa ${plan.rows} files de ${plan.cols} magdalenes a la safata`
  if (plan.mode === 'partials') return built ? 'Ara suma les dues parts. Quin és el total?' : 'Toca cada safata per calcular-ne la part'
  return 'Mira bé i tria la resposta'
}

/** One "La Fleca de les Files" question, remounted per item (key = item.id). */
export function FlecaFilesRound({ flow, rounds, onNext }: RoundProps) {
  const { item } = flow
  const plan = useMemo(() => planFromItem(item), [item])
  const stage = item.cpaStage
  const prefilled = stage !== 'concret'
  const total = plan.mode === 'array' ? plan.rows * plan.cols : 0
  const [placed, setPlaced] = useState(prefilled ? total : 0)
  const [revealed, setRevealed] = useState<readonly [boolean, boolean]>(prefilled ? [true, true] : [false, false])
  const [requested, setRequested] = useState(false)
  const [dragging, setDragging] = useState(false)
  const { feedback, done, setFeedback, answer } = useRoundAnswer(flow, rounds)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])

  const interactive = plan.mode !== 'plain'
  const solution = flow.hintLevel === 3
  const hidden = stage === 'abstracte' && interactive && !requested && flow.hintLevel < 2
  const shownPlaced = solution ? total : placed
  const built = plan.mode === 'array' ? shownPlaced >= total : plan.mode === 'partials' ? solution || (revealed[0] && revealed[1]) : true
  const showChoices = !interactive || hidden || built
  const hinting = flow.hintLevel >= 1

  const place = (): void => {
    if (placed >= total) return
    unlockAudio()
    sfx.pop()
    setFeedback(null)
    setPlaced((n) => Math.min(total, n + 1))
  }
  const handleDragEnd = (event: DragEndEvent): void => {
    setDragging(false)
    if (event.over?.id === TRAY_DROP_ID) place()
  }
  const reveal = (index: 0 | 1): void => setRevealed((r) => (index === 0 ? [true, r[1]] : [r[0], true]))

  const caption =
    plan.mode === 'array'
      ? hinting && built
        ? (splitCaption(plan.rows, plan.cols) ?? trayCaption(plan.rows, plan.cols, shownPlaced))
        : trayCaption(plan.rows, plan.cols, shownPlaced)
      : undefined

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
              Mostra la safata
            </Button>
          )}
          {!hidden && plan.mode === 'array' && (
            <>
              <BakingTray rows={plan.rows} cols={plan.cols} placed={shownPlaced} showSplit={hinting && built} highlight={dragging} />
              <p aria-live="polite" className="sticker rounded-full bg-white px-5 py-1 text-2xl font-bold text-brand-dark">
                {caption}
              </p>
              {!built && <Basket remaining={total - placed} perRow={plan.cols} tone={Math.floor(placed / plan.cols)} onPlace={place} />}
            </>
          )}
          {!hidden && plan.mode === 'partials' && <PartialsBoard a={plan.a} b={plan.b} revealed={solution ? [true, true] : revealed} onReveal={reveal} />}
          {plan.mode === 'plain' && <VisualModelView key={item.id} model={item.visual} size="md" />}
          {hinting && plan.mode !== 'array' && item.hintVisual.kind !== 'none' && <VisualModelView model={item.hintVisual} size="sm" animate={flow.hintLevel === 1} />}
          {showChoices && <ChoiceRow choices={item.choices} wrongValues={flow.wrongValues} disabled={done} onPick={(c) => void answer(c)} />}
        </div>
        <DragOverlay>{dragging ? <Cupcake size={72} tone={0} /> : null}</DragOverlay>
      </DndContext>
      <FeedbackBar
        mood={feedback?.mood ?? 'pensa'}
        tone={feedback?.tone ?? 'neutral'}
        message={feedback?.text ?? instruction(plan, built)}
        action={done ? <NextButton last={rounds.finished} onClick={onNext} /> : undefined}
      />
    </div>
  )
}
