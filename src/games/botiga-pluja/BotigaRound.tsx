import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useEffect, useMemo, useState } from 'react'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { Button } from '../../ui/Button'
import { purseFor, sumCents } from '../../ui/visual/moneyLogic'
import { MoneyPiece } from '../../ui/visual/MoneyPiece'
import { VisualModelView } from '../../ui/visual/VisualModelView'
import { ChoiceRow } from '../shared/ChoiceRow'
import { FeedbackBar } from '../shared/FeedbackBar'
import { NextButton } from '../shared/NextButton'
import { useRoundAnswer } from '../shared/useRoundAnswer'
import type { RoundProps } from '../shared/useGameBase'
import { COUNTER_DROP_ID, Purse, ShopCounter } from './PurseAndCounter'
import { addPiece, planFromItem, removePiece, solutionPieces, verdict, wrongValueFor } from './shopLogic'

/** One "La Botiga de la Pluja" question, remounted per item (key = item.id). */
export function BotigaRound({ flow, rounds, onNext }: RoundProps) {
  const { item } = flow
  const plan = useMemo(() => planFromItem(item), [item])
  const target = plan.mode === 'pay' ? plan.target : 0
  const purse = useMemo(() => (plan.mode === 'pay' ? purseFor(plan.target) : []), [plan])
  const [pieces, setPieces] = useState<readonly number[]>([])
  const [dragging, setDragging] = useState<number | undefined>(undefined)
  const { feedback, done, setFeedback, answer } = useRoundAnswer(flow, rounds)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])

  const solution = flow.hintLevel === 3
  const shown = solution && plan.mode === 'pay' ? solutionPieces(target) : pieces
  const total = sumCents(shown)

  const add = (cents: number): void => {
    if (done || solution) return
    unlockAudio()
    sfx.pop()
    setFeedback(null)
    setPieces((current) => addPiece(current, cents))
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    const cents = event.active.data.current?.['cents']
    setDragging(undefined)
    if (event.over?.id === COUNTER_DROP_ID && typeof cents === 'number') add(cents)
  }

  const confirm = (): void => {
    if (plan.mode !== 'pay' || total === 0) return
    void answer({ value: total === target ? item.answer : wrongValueFor(total, item.answer, item.choices) })
  }

  const info = plan.mode === 'pay' ? verdict(shown, target) : undefined
  const message = feedback?.text ?? info?.message ?? 'Mira les monedes i tria la resposta'

  return (
    <div className="flex flex-1 flex-col">
      <p className="mx-auto max-w-2xl px-3 text-center text-2xl font-bold leading-tight tracking-tight text-brand-dark sm:text-3xl [@media(min-height:901px)]:text-3xl sm:[@media(min-height:901px)]:text-4xl">
        <span aria-hidden="true">☂️ </span>
        {item.text}
      </p>
      <DndContext
        sensors={sensors}
        onDragStart={(e) => setDragging(typeof e.active.data.current?.['cents'] === 'number' ? (e.active.data.current['cents'] as number) : undefined)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(undefined)}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-1 [@media(min-height:901px)]:gap-3 [@media(min-height:901px)]:py-2">
          {item.visual.kind !== 'none' && <VisualModelView key={item.id} model={item.visual} size="md" />}
          {plan.mode === 'pay' ? (
            <>
              <ShopCounter pieces={shown} total={total} highlight={dragging !== undefined} onRemove={(i) => !solution && !done && setPieces((c) => removePiece(c, i))} />
              {!done && <Purse pieces={purse} onAdd={add} />}
              {!done && (
                <Button variant="ok" big tilt={1.5} disabled={total === 0 || solution} onClick={confirm}>
                  Ja està!
                </Button>
              )}
            </>
          ) : (
            <>
              {flow.hintLevel >= 1 && item.hintVisual.kind !== 'none' && <VisualModelView model={item.hintVisual} size="sm" animate={flow.hintLevel === 1} />}
              <ChoiceRow choices={item.choices} wrongValues={flow.wrongValues} disabled={done} onPick={(c) => void answer(c)} />
            </>
          )}
        </div>
        <DragOverlay>{dragging !== undefined ? <MoneyPiece cents={dragging} size={72} /> : null}</DragOverlay>
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
