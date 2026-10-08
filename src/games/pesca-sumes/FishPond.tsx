import type { RefObject } from 'react'
import type { Choice } from '../../core/ambit/types'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import type { BubbleState } from '../../ui/question/ChoiceBubble'
import type { FishSlot } from './fishLogic'

const LANES = 4
const TONES = ['bg-chicle text-white', 'bg-cel text-punk', 'bg-sol text-punk', 'bg-menta text-punk'] as const
const STATE_CLASS: Record<BubbleState, string> = {
  idle: '',
  wrong: '!bg-gray-200 !text-gray-400 opacity-70',
  correct: '!bg-ok !text-white ring-8 ring-sol',
  solution: '!bg-ok !text-white ring-8 ring-sol',
  dimmed: 'opacity-50',
}

/** Fish swim from the right to the left; the keyframes only exist while the pond is in moving mode. */
const KEYFRAMES = `@keyframes fish-swim { from { left: 78%; opacity: 0 } 6% { opacity: 1 } to { left: -38%; opacity: 1 } }`

export interface FishPondProps {
  choices: readonly Choice[]
  stateOf: (value: string) => BubbleState
  shaking: string | undefined
  /** Moving fish (false = calm mode: still fish, nothing leaves). */
  moving: boolean
  driftMs: number
  slots: readonly FishSlot[]
  paused: boolean
  frozen: boolean
  onPick: (choice: Choice) => void
  containerRef: RefObject<HTMLDivElement | null>
}

function FishButton({ choice, index, state, shaking, onPick, className, style }: {
  choice: Choice
  index: number
  state: BubbleState
  shaking: boolean
  onPick: () => void
  className: string
  style?: React.CSSProperties
}) {
  return (
    <button
      type="button"
      aria-label={`Resposta ${choice.value}`}
      disabled={state === 'wrong' || state === 'correct' || state === 'dimmed'}
      onClick={() => {
        unlockAudio()
        sfx.pop()
        onPick()
      }}
      style={style}
      className={`sticker flex min-h-[4.5rem] min-w-[7.5rem] items-center justify-center gap-2 rounded-full px-5 py-2 text-5xl font-bold tabular-nums ${TONES[index % TONES.length]} ${STATE_CLASS[state]} ${shaking ? 'animate-pulse' : ''} ${className}`}
    >
      <span aria-hidden="true" className="text-4xl">
        🐟
      </span>
      {choice.value}
    </button>
  )
}

/** The pond: answers swim by as fish (moving mode) or rest in a calm row (calm mode / reduced motion). */
export function FishPond({ choices, stateOf, shaking, moving, driftMs, slots, paused, frozen, onPick, containerRef }: FishPondProps) {
  if (!moving) {
    return (
      <div ref={containerRef} role="group" aria-label="Respostes" className="flex min-h-48 flex-wrap items-center justify-center gap-5 rounded-[2rem] bg-cel/30 p-4" data-testid="pond" data-mode="calm">
        {choices.map((choice, i) => (
          <FishButton key={choice.value} choice={choice} index={i} state={stateOf(choice.value)} shaking={shaking === choice.value} onPick={() => onPick(choice)} className="" />
        ))}
      </div>
    )
  }
  return (
    <div ref={containerRef} role="group" aria-label="Respostes" className="relative h-[22rem] w-full overflow-hidden rounded-[2rem] bg-cel/30" data-testid="pond" data-mode="moving">
      <style>{KEYFRAMES}</style>
      {choices.map((choice, i) => {
        const slot = slots[i] ?? { lane: i % LANES, delayMs: 0 }
        return (
          <FishButton
            key={choice.value}
            choice={choice}
            index={i}
            state={stateOf(choice.value)}
            shaking={shaking === choice.value}
            onPick={() => onPick(choice)}
            className="absolute"
            style={{
              top: `${slot.lane * (100 / LANES) + 3}%`,
              left: '78%',
              opacity: 0,
              animationName: 'fish-swim',
              animationDuration: `${driftMs}ms`,
              animationTimingFunction: 'linear',
              animationDelay: `${slot.delayMs}ms`,
              animationFillMode: 'both',
              animationPlayState: paused || frozen ? 'paused' : 'running',
            }}
          />
        )
      })}
    </div>
  )
}
