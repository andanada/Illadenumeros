import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useEffect, useMemo, useState } from 'react'
import type { Choice } from '../../core/ambit/types'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { Button } from '../../ui/Button'
import { ChoiceRow } from '../shared/ChoiceRow'
import { FeedbackBar } from '../shared/FeedbackBar'
import { NextButton } from '../shared/NextButton'
import type { RoundProps } from '../shared/useGameBase'
import { CounterFrame } from './CounterFrame'
import { BOARD_DROP_ID, BoardDropZone, CounterTray } from './CounterTray'
import {
  boardCells,
  completeBoard,
  emptyBoard,
  instructionFor,
  placeCounter,
  planFromItem,
  stepOf,
  targetPlaced,
  toggleCross,
  trayCount,
  type BoardState,
} from './frameLogic'

interface Feedback {
  text: string
  tone: 'ok' | 'almost'
  mood: 'content' | 'anims' | 'balla'
}

/** One Marc Màgic question, remounted per item (key = item.id). */
export function MarcMagicRound({ flow, rounds, onNext }: RoundProps) {
  const { item } = flow
  const plan = useMemo(() => planFromItem(item), [item])
  const stage = item.cpaStage
  const prefilled = plan.mode === 'count' || stage !== 'concret'
  const [board, setBoard] = useState<BoardState>(() => (prefilled ? completeBoard(plan) : emptyBoard))
  const [frameRequested, setFrameRequested] = useState(false)
  const [counted, setCounted] = useState<number[]>([])
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [done, setDone] = useState(false)
  const [dragging, setDragging] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])

  const step = stepOf(plan, board)
  const hidden = stage === 'abstracte' && plan.mode !== 'count' && !frameRequested && flow.hintLevel < 2
  const showChoices = hidden || step === 'answer'
  const cells = useMemo(() => boardCells(plan, board), [plan, board])
  const ordinals = useMemo(() => Object.fromEntries(counted.map((cell, i) => [cell, i + 1])), [counted])
  const trayStep = step === 'build-first' || step === 'build-second' ? step : undefined

  const place = (): void => {
    unlockAudio()
    sfx.pop()
    setFeedback(null)
    setBoard((current) => placeCounter(plan, current))
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    setDragging(false)
    if (event.over?.id === BOARD_DROP_ID) place()
  }

  const handleCellTap = (index: number): void => {
    if (step === 'cross') {
      sfx.tap()
      setBoard((current) => toggleCross(plan, current, index))
      return
    }
    if (step !== 'answer') return
    sfx.tap()
    setCounted((current) => (current.includes(index) ? [] : [...current, index]))
  }

  const handleChoice = async (choice: Choice): Promise<void> => {
    const errorsBefore = flow.errors
    const result = await flow.answer(choice)
    rounds.register(result, errorsBefore)
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
  }

  const message = feedback?.text ?? instructionFor(plan, step)
  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-5xl font-bold tracking-tight text-brand-dark">{item.text}</p>
      <DndContext sensors={sensors} onDragStart={() => setDragging(true)} onDragEnd={handleDragEnd} onDragCancel={() => setDragging(false)}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2">
          {hidden ? (
            <Button
              variant="soft"
              tilt={-2}
              onClick={() => {
                flow.markHint()
                setFrameRequested(true)
              }}
            >
              Mostra el marc
            </Button>
          ) : (
            <BoardDropZone>
              <CounterFrame cells={cells} offset={0} ordinals={ordinals} tappable={step === 'cross' || step === 'answer'} onCellTap={handleCellTap} highlight={dragging} />
              {targetPlaced(plan) > 10 && (
                <CounterFrame cells={cells} offset={10} ordinals={ordinals} tappable={step === 'cross' || step === 'answer'} onCellTap={handleCellTap} highlight={dragging} />
              )}
            </BoardDropZone>
          )}
          {trayStep && <CounterTray count={trayCount(plan, board)} step={trayStep} onPlace={place} />}
          {showChoices && <ChoiceRow choices={item.choices} wrongValues={flow.wrongValues} disabled={done} onPick={(c) => void handleChoice(c)} />}
        </div>
        <DragOverlay>
          {dragging ? <div className={`sticker size-[4.5rem] rounded-full ${trayStep === 'build-second' ? 'bg-cel' : 'bg-chicle'}`} /> : null}
        </DragOverlay>
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
