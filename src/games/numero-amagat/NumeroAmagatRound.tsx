import { DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Choice } from '../../core/ambit/types'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { VisualModelView } from '../../ui/visual/VisualModelView'
import { ChoiceRow } from '../shared/ChoiceRow'
import { FeedbackBar } from '../shared/FeedbackBar'
import { NextButton } from '../shared/NextButton'
import { useRoundAnswer } from '../shared/useRoundAnswer'
import type { RoundProps } from '../shared/useGameBase'
import { BalanceScale, SLOT_DROP_ID } from './BalanceScale'
import { balanceState, parseEquation } from './scaleLogic'

/** A wrong weight stays on the pan this long, then goes back to the tray. */
const RETURN_MS = 1100
const COLORS = ['bg-chicle', 'bg-cel', 'bg-menta', 'bg-sol'] as const

interface WeightProps {
  choice: Choice
  index: number
  disabled: boolean
  tried: boolean
  onPlace: (choice: Choice) => void
}

function Weight({ choice, index, disabled, tried, onPlace }: WeightProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: choice.value, disabled })
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={`Resposta ${choice.value}`}
      disabled={disabled || tried}
      onClick={() => onPlace(choice)}
      {...attributes}
      {...listeners}
      style={{ rotate: `${(index % 2 === 0 ? -1 : 1) * 3}deg` }}
      className={`sticker grid size-[5rem] touch-none place-items-center rounded-3xl text-4xl font-bold text-ink disabled:opacity-35 ${COLORS[index % COLORS.length]} ${isDragging ? 'opacity-30' : 'cursor-grab'}`}
    >
      {choice.value}
    </button>
  )
}

/** One "El Número Amagat" question, remounted per item (key = item.id): put the right weight on the pan. */
export function NumeroAmagatRound({ flow, rounds, onNext }: RoundProps) {
  const { item } = flow
  const equation = useMemo(() => parseEquation(item.text), [item.text])
  const [guess, setGuess] = useState<number | null>(null)
  const [held, setHeld] = useState<string>()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { feedback, done, answer } = useRoundAnswer(flow, rounds)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])
  useEffect(() => () => clearTimeout(timer.current), [])

  const place = useCallback(
    (choice: Choice): void => {
      if (done || guess !== null) return
      unlockAudio()
      sfx.pop()
      setGuess(Number(choice.value))
      void answer(choice)
      if (choice.value !== item.answer) timer.current = setTimeout(() => setGuess(null), RETURN_MS)
    },
    [answer, done, guess, item.answer],
  )

  const handleDragEnd = (event: DragEndEvent): void => {
    setHeld(undefined)
    const choice = item.choices.find((c) => c.value === event.active.id)
    if (choice && event.over?.id === SLOT_DROP_ID) place(choice)
  }

  const hinting = flow.hintLevel >= 1
  const shownGuess = flow.hintLevel === 3 ? Number(item.answer) : guess
  const busy = done || guess !== null
  const hint = hinting && item.hintVisual.kind !== 'none' && <VisualModelView model={item.hintVisual} size="sm" animate={flow.hintLevel === 1} />
  const footer = (
    <FeedbackBar
      mood={feedback?.mood ?? 'pensa'}
      tone={feedback?.tone ?? 'neutral'}
      message={feedback?.text ?? 'Quin pes falta perquè la balança quedi igual? Toca un pes o arrossega’l.'}
      action={done ? <NextButton last={rounds.finished} onClick={onNext} /> : undefined}
    />
  )

  if (!equation) {
    return (
      <div className="flex flex-1 flex-col">
        <p data-testid="question-text" className="text-center text-5xl font-bold tracking-tight text-brand-dark">{item.text}</p>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          {hint}
          <ChoiceRow choices={item.choices} wrongValues={flow.wrongValues} disabled={done} onPick={(c) => void answer(c)} />
        </div>
        {footer}
      </div>
    )
  }

  const state = balanceState(equation, shownGuess)
  return (
    <div className="flex flex-1 flex-col">
      <p data-testid="question-text" className="text-center text-5xl font-bold tracking-tight text-brand-dark">{item.text}</p>
      <DndContext sensors={sensors} onDragStart={(e) => setHeld(String(e.active.id))} onDragEnd={handleDragEnd} onDragCancel={() => setHeld(undefined)}>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-1">
          <BalanceScale equation={equation} state={state} guess={shownGuess} dragging={held !== undefined} />
          {hint}
          <div role="group" aria-label="Respostes" className="flex flex-wrap items-center justify-center gap-3 p-1">
            {item.choices.map((choice, i) => (
              <Weight key={choice.value} choice={choice} index={i} disabled={busy} tried={flow.wrongValues.includes(choice.value)} onPlace={place} />
            ))}
          </div>
        </div>
        <DragOverlay>
          {held !== undefined ? <span className="sticker grid size-[5rem] place-items-center rounded-3xl bg-chicle text-4xl font-bold text-white">{held}</span> : null}
        </DragOverlay>
      </DndContext>
      {footer}
    </div>
  )
}
