import { useEffect, useMemo, useState, type RefObject } from 'react'
import { sfx } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { useProgress } from '../../core/progress/store'
import { FeedbackBar } from '../shared/FeedbackBar'
import { NextButton } from '../shared/NextButton'
import type { RoundProps } from '../shared/useGameBase'
import { JumpControls } from './JumpControls'
import { JumpLine } from './JumpLine'
import { evaluatePath, positionAfter, positionsOf, windowFor, type Jump } from './jumpLogic'

const LAND_DELAY_MS = 600

interface Feedback {
  text: string
  tone: 'ok' | 'almost'
  mood: 'balla' | 'anims'
}

export interface JumpRoundProps extends RoundProps {
  start: number
  target: number
  /** Whether the "salts de 10" tip was already offered in this game. */
  tipSeen: RefObject<boolean>
}

/** Jump on the number line from `start` until landing on the answer. Remounted per item. */
export function JumpRound({ flow, rounds, onNext, start, target, tipSeen }: JumpRoundProps) {
  const { item } = flow
  const character = useProgress((s) => s.profile?.character) ?? 'nyx'
  const [jumps, setJumps] = useState<readonly Jump[]>([])
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [done, setDone] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])

  const position = positionAfter(start, jumps)
  const positions = useMemo(() => positionsOf(start, jumps), [start, jumps])
  const view = useMemo(() => windowFor(positions, target), [positions, target])
  const net = position - start
  const reached = position === target

  const finishCorrect = async (): Promise<void> => {
    const errorsBefore = flow.errors
    const result = await flow.answer({ value: String(target) })
    rounds.register(result, errorsBefore)
    const report = evaluatePath(start, target, jumps)
    sfx.star()
    setDone(true)
    if (report.suggestTens && !tipSeen.current) {
      tipSeen.current = true
      setFeedback({ tone: 'ok', mood: 'balla', text: 'Has arribat! Camí més curt? Prova amb salts de 10.' })
    } else {
      setFeedback({ tone: 'ok', mood: 'balla', text: report.efficient ? 'Quin salt! Camí perfecte.' : 'Molt bé, has arribat!' })
    }
  }

  // Landing exactly on the answer submits automatically after the hop finishes; undo cancels it.
  useEffect(() => {
    if (!reached || done || jumps.length === 0) return
    const timer = window.setTimeout(() => void finishCorrect(), LAND_DELAY_MS)
    return () => window.clearTimeout(timer)
    // finishCorrect closes over the current flow/jumps; the effect re-arms on every jump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reached, done, jumps])

  const confirmWrong = async (): Promise<void> => {
    const errorsBefore = flow.errors
    const result = await flow.answer({ value: String(position) })
    rounds.register(result, errorsBefore)
    if (result.itemDone) {
      setRevealed(true)
      setDone(true)
      setFeedback({ tone: 'almost', mood: 'anims', text: item.hints[2] })
      return
    }
    sfx.almost()
    setFeedback({ tone: 'almost', mood: 'anims', text: `Gairebé! ${item.hints[Math.min(errorsBefore, 1)]}` })
  }

  const shown = revealed ? [...positions, target] : positions
  const shownJumps = revealed ? [...jumps, (target - position) as Jump] : jumps
  const message = feedback?.text ?? `Fes salts per ${item.operands?.op === '-' ? 'restar' : 'sumar'} ${item.operands?.b ?? ''}. Has saltat ${Math.abs(net)}.`

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-5xl font-bold tracking-tight text-brand-dark">{item.text}</p>
      <div className="flex flex-1 flex-col justify-center">
        <JumpLine
          lo={view.lo}
          hi={view.hi}
          positions={shown}
          jumps={shownJumps}
          target={target}
          showTarget={flow.hintLevel >= 1 || revealed}
          character={character}
          mood={done ? 'balla' : feedback ? 'anims' : 'pensa'}
        />
        <JumpControls
          position={position}
          disabled={done}
          canUndo={jumps.length > 0}
          canConfirm={jumps.length > 0 && !reached}
          onJump={(jump) => {
            setFeedback(null)
            setJumps((current) => [...current, jump])
          }}
          onUndo={() => {
            setFeedback(null)
            setJumps((current) => current.slice(0, -1))
          }}
          onConfirm={() => void confirmWrong()}
        />
      </div>
      <FeedbackBar
        mood={feedback?.mood ?? 'pensa'}
        tone={feedback?.tone ?? 'neutral'}
        message={message}
        action={done ? <NextButton last={rounds.finished} onClick={onNext} /> : undefined}
      />
    </div>
  )
}
