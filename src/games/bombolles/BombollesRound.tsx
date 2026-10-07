import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Choice } from '../../core/ambit/types'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { createRng } from '../../core/rng'
import { ChoiceRow } from '../shared/ChoiceRow'
import { FeedbackBar } from '../shared/FeedbackBar'
import { NextButton } from '../shared/NextButton'
import { buildCells, TenFrameGrid } from '../shared/TenFrameGrid'
import type { RoundProps } from '../shared/useGameBase'
import { generateBubbleField, type Bubble, type BubbleTask } from './bubbleField'
import { BubbleView } from './BubbleView'
import { hintFrameShape, judgePair, toggleSelection, wrongPairValue } from './pairLogic'

type Phase = 'pick' | 'bridge' | 'done'
type Mood = 'salut' | 'content' | 'pensa' | 'anims' | 'balla'

const SPARKS = [0, 60, 120, 180, 240, 300] as const

function Star({ x, y, total }: { x: number; y: number; total: number }) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
      <motion.div
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: -6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 11 }}
        className="sticker relative grid size-32 place-items-center bg-sol text-6xl font-bold text-ink"
        style={{ clipPath: 'polygon(50% 0, 62% 33%, 98% 36%, 70% 57%, 80% 92%, 50% 72%, 20% 92%, 30% 57%, 2% 36%, 38% 33%)' }}
      >
        <span className="mt-2">{total}</span>
      </motion.div>
      {SPARKS.map((deg) => (
        <motion.span
          key={deg}
          aria-hidden="true"
          initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
          animate={{ opacity: 0, x: Math.cos((deg * Math.PI) / 180) * 90, y: Math.sin((deg * Math.PI) / 180) * 90, scale: 1.2 }}
          transition={{ duration: 0.8 }}
          className="absolute left-1/2 top-1/2 text-3xl"
        >
          ✨
        </motion.span>
      ))}
    </div>
  )
}

/** One bubble round, remounted per item (key = item.id), so all local state resets. */
export function BombollesRound({ flow, rounds, onNext, task }: RoundProps & { task: BubbleTask }) {
  const { item } = flow
  const field = useMemo(() => generateBubbleField(task, createRng(item.id)), [task, item.id])
  const target = field.find((b) => b.role === 'target')
  const friend = field.find((b) => b.role === 'friend')
  const [selected, setSelected] = useState<string[]>(target ? [target.id] : [])
  const [phase, setPhase] = useState<Phase>('pick')
  const [bounce, setBounce] = useState(0)
  const [localWrong, setLocalWrong] = useState(0)
  const [mood, setMood] = useState<Mood>('pensa')
  const [tone, setTone] = useState<'neutral' | 'ok' | 'almost'>('neutral')
  const [message, setMessage] = useState(
    task.bridge ? `Primer fes 10: busca l’amic del ${task.a}.` : `Busca l’amic del ${task.a} per fer ${task.total}.`,
  )

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])

  const merged = phase !== 'pick'
  const starPos = target && friend ? { x: (target.x + friend.x) / 2, y: (target.y + friend.y) / 2 } : { x: 50, y: 50 }
  const showFrame = !merged && (flow.hintLevel >= 1 || localWrong >= 1)
  const shape = hintFrameShape(task)

  const celebrate = (text: string): void => {
    sfx.star()
    setMood('balla')
    setTone('ok')
    setMessage(text)
  }

  const mergeCorrectPair = (): void => {
    if (task.bridge) {
      sfx.pop()
      setPhase('bridge')
      setMood('content')
      setTone('ok')
      setMessage(`Has fet 10! Ara: 10 + ${task.bridge.rest} = ?`)
      return
    }
    setPhase('done')
    celebrate(`Molt bé! ${task.a} i ${task.friend} fan ${task.total}!`)
  }

  const softWrong = (text: string): void => {
    sfx.almost()
    setBounce((b) => b + 1)
    setSelected(target ? [target.id] : [])
    setMood('anims')
    setTone('almost')
    setMessage(text)
  }

  const submitWrong = async (first: Bubble, second: Bubble): Promise<void> => {
    if (task.bridge) {
      const count = localWrong + 1
      setLocalWrong(count)
      if (count >= 3) {
        mergeCorrectPair()
        return
      }
      softWrong(`Gairebé! ${task.a} necessita un amic per fer 10. Mira el marc.`)
      return
    }
    const errorsBefore = flow.errors
    const result = await flow.answer({ value: wrongPairValue(first, second) })
    rounds.register(result, errorsBefore)
    if (result.itemDone) {
      mergeCorrectPair()
      setMessage(item.hints[2])
      return
    }
    softWrong(`Gairebé! ${item.hints[Math.min(errorsBefore, 1)]}`)
  }

  const busy = useRef(false)

  const handleTap = async (bubble: Bubble): Promise<void> => {
    unlockAudio()
    if (phase !== 'pick' || busy.current) return
    const next = toggleSelection(selected, bubble.id)
    if (next.length < 2) {
      sfx.tap()
      setSelected(next)
      return
    }
    const first = field.find((b) => b.id === selected[0])
    if (!first) return
    setSelected(next)
    const verdict = judgePair(first, bubble, task)
    if (verdict === 'match') {
      if (task.bridge) {
        mergeCorrectPair()
        return
      }
      busy.current = true
      try {
        const errorsBefore = flow.errors
        const result = await flow.answer({ value: item.answer })
        rounds.register(result, errorsBefore)
        mergeCorrectPair()
      } finally {
        busy.current = false
      }
    } else if (verdict === 'wrong-with-target') {
      await submitWrong(first, bubble)
    } else {
      softWrong(`Busca l’amic del ${task.a}: és la bombolla brillant.`)
    }
  }

  const handleChoice = async (choice: Choice): Promise<void> => {
    const errorsBefore = flow.errors
    const result = await flow.answer(choice)
    rounds.register(result, errorsBefore)
    if (result.correct) {
      setPhase('done')
      celebrate(`Perfecte! ${item.text.replace('?', item.answer)}`)
    } else if (result.itemDone) {
      setPhase('done')
      setMood('anims')
      setTone('neutral')
      setMessage(item.hints[2])
    } else {
      softWrong(item.hints[Math.min(errorsBefore, 1)] ?? 'Torna-ho a provar!')
    }
  }

  const visible = field.filter((b) => !(merged && (b.role === 'target' || b.role === 'friend')))
  const done = phase === 'done'

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-5xl font-bold tracking-tight text-brand-dark" aria-live="polite">
        {item.text}
      </p>
      <div className="relative mx-auto my-2 min-h-[300px] w-full max-w-3xl flex-1">
        <AnimatePresence>
          {visible.map((bubble) => (
            <BubbleView
              key={bubble.id}
              bubble={bubble}
              selected={selected.includes(bubble.id)}
              highlighted={bubble.role === 'target' && !selected.includes(bubble.id)}
              bounceKey={bounce}
              disabled={phase !== 'pick'}
              onTap={(b) => void handleTap(b)}
            />
          ))}
        </AnimatePresence>
        {merged && <Star x={starPos.x} y={starPos.y} total={task.total} />}
        {showFrame && (
          <div className="absolute bottom-0 right-0 hidden sm:block">
            <TenFrameGrid
              cells={buildCells(shape.filled, shape.missing, 'ghost')}
              cell={32}
              label={`Marc de deu: ${task.a} fitxes i ${shape.missing} caselles buides`}
            />
          </div>
        )}
      </div>
      {phase === 'bridge' && <ChoiceRow choices={item.choices} wrongValues={flow.wrongValues} onPick={(c) => void handleChoice(c)} />}
      <FeedbackBar
        mood={mood}
        tone={tone}
        message={message}
        action={done ? <NextButton last={rounds.finished} onClick={onNext} /> : undefined}
      />
    </div>
  )
}
