import { motion } from 'motion/react'

const TONES = [
  'bg-chicle text-white',
  'bg-cel text-punk',
  'bg-sol text-punk',
  'bg-menta text-punk',
] as const

export type BubbleState = 'idle' | 'wrong' | 'correct' | 'solution' | 'dimmed'

const STATE_CLASS: Record<BubbleState, string> = {
  idle: '',
  wrong: '!bg-gray-200 !text-gray-400 opacity-70',
  correct: '!bg-ok !text-white',
  solution: '!bg-ok !text-white ring-8 ring-sol',
  dimmed: 'opacity-50',
}

/** Big round sticker answer: at least 80 px, comfortable for fingers and mice. */
export function ChoiceBubble({
  value,
  index,
  state,
  shaking,
  disabled,
  onPick,
}: {
  value: string
  index: number
  state: BubbleState
  shaking: boolean
  disabled: boolean
  onPick: () => void
}) {
  const tone = TONES[index % TONES.length] ?? TONES[0]
  const tilt = ((index * 7) % 5) - 2
  return (
    <motion.button
      type="button"
      aria-label={`Resposta ${value}`}
      aria-pressed={state === 'correct' || state === 'solution'}
      disabled={disabled}
      onClick={onPick}
      initial={{ scale: 0.6, opacity: 0, rotate: tilt * 3 }}
      animate={
        shaking
          ? { x: [0, -8, 8, -5, 5, 0], scale: 1, opacity: 1, rotate: tilt }
          : state === 'correct'
            ? { scale: [1, 1.18, 1.08], opacity: 1, rotate: tilt }
            : { scale: 1, opacity: 1, rotate: tilt }
      }
      transition={shaking ? { duration: 0.45 } : { type: 'spring', stiffness: 320, damping: 16, delay: index * 0.05 }}
      whileHover={disabled ? undefined : { scale: 1.06 }}
      whileTap={disabled ? undefined : { scale: 0.93 }}
      className={`sticker grid min-h-24 min-w-24 place-items-center rounded-full px-5 py-3 text-5xl font-bold tabular-nums transition-colors disabled:cursor-default sm:min-h-28 sm:min-w-28 sm:text-6xl ${tone} ${STATE_CLASS[state]}`}
    >
      {value}
    </motion.button>
  )
}
