import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { Choice } from '../core/ambit/types'
import { sfx, unlockAudio } from '../core/audio/sfx'
import { speak } from '../core/audio/speech'
import type { CharacterId } from '../core/storage/db'
import type { AnswerResult, QuestionFlow } from '../features/play/useQuestionFlow'
import { Confetti } from './Confetti'
import { SpeakerButton } from './Screen'
import { Mascot } from './mascot/Mascot'
import { ChoiceBubble, type BubbleState } from './question/ChoiceBubble'
import { HintPanel } from './question/HintPanel'
import { VisualModelView } from './visual/VisualModelView'

const ADVANCE_MS = 900
const CONFETTI_EVERY = 5

export interface QuestionCardProps {
  flow: QuestionFlow
  character: CharacterId
  onResult?: (result: AnswerResult) => void
  onContinue: () => void
}

function bubbleState(value: string, answer: string, wrong: readonly string[], solvedHere: boolean, revealed: boolean): BubbleState {
  if (solvedHere) return value === answer ? 'correct' : 'dimmed'
  if (revealed) return value === answer ? 'solution' : wrong.includes(value) ? 'wrong' : 'dimmed'
  return wrong.includes(value) ? 'wrong' : 'idle'
}

export function QuestionCard({ flow, character, onResult, onContinue }: QuestionCardProps) {
  const { item, hintLevel, wrongValues } = flow
  const [solvedId, setSolvedId] = useState<string | undefined>(undefined)
  const [shake, setShake] = useState<{ id: string; value: string; n: number } | undefined>(undefined)
  const [confetti, setConfetti] = useState(0)
  const busy = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const continueRef = useRef(onContinue)
  // Kept current after every commit (refs are not written during render).
  useEffect(() => {
    continueRef.current = onContinue
  })

  const solvedHere = solvedId === item.id
  const revealed = hintLevel === 3 && !solvedHere

  useEffect(() => {
    speak(item.speech)
  }, [item.id, item.speech])

  useEffect(() => () => clearTimeout(timer.current), [])

  const pick = async (choice: Choice) => {
    if (busy.current || solvedHere || revealed) return
    busy.current = true
    unlockAudio()
    try {
      const result = await flow.answer(choice)
      onResult?.(result)
      if (result.correct) {
        sfx.correct()
        setSolvedId(item.id)
        if ((flow.streak + 1) % CONFETTI_EVERY === 0) setConfetti((n) => n + 1)
        timer.current = setTimeout(() => continueRef.current(), ADVANCE_MS)
      } else {
        sfx.almost()
        setShake((s) => ({ id: item.id, value: choice.value, n: (s?.n ?? 0) + 1 }))
      }
    } finally {
      busy.current = false
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-3 pb-8">
      {confetti > 0 && <Confetti key={confetti} count={36} emoji />}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <h2 className="text-center text-5xl font-bold leading-tight tracking-tight text-brand-dark sm:text-6xl" data-testid="question-text">
          {item.text}
        </h2>
        <SpeakerButton text={item.speech} label="Escoltar la pregunta" />
      </div>

      {item.visual.kind !== 'none' && (
        <div className="rounded-[2rem] bg-white/60 p-3">
          <VisualModelView key={item.id} model={item.visual} size="md" />
        </div>
      )}

      <div role="group" aria-label="Respostes" className="flex flex-wrap items-center justify-center gap-5">
        {item.choices.map((choice, i) => {
          const state = bubbleState(choice.value, item.answer, wrongValues, solvedHere, revealed)
          return (
            <ChoiceBubble
              key={`${item.id}:${choice.value}`}
              value={choice.value}
              index={i}
              state={state}
              shaking={shake?.id === item.id && shake.value === choice.value && state === 'wrong' && shake.n > 0}
              disabled={solvedHere || revealed || state === 'wrong'}
              onPick={() => void pick(choice)}
            />
          )
        })}
      </div>

      {solvedHere && (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-3" aria-live="polite">
          <Mascot character={character} mood="content" size={90} />
          <p className="text-3xl font-bold text-ok">Molt bé! ✨</p>
        </motion.div>
      )}

      {!solvedHere && hintLevel !== 0 && (
        <HintPanel item={item} level={hintLevel} character={character} onContinue={() => onContinue()} />
      )}
    </div>
  )
}
