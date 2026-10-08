import { motion } from 'motion/react'

export interface DrumsProps {
  beats: readonly number[]
  size: number
  /** Beat the metronome points at (index in `beats`). */
  pulse: number
  showNumbers: boolean
  reduced: boolean
  disabled: boolean
  /** Hide the strong beat's number (the child has to say it). */
  maskStrong: boolean
  onTap: (beat: number) => void
}

const strong = (beat: number, size: number): boolean => beat % size === 0

/** One bar of drums (64 px each). The last one is the strong beat; the metronome dot moves under the pulse. */
export function Drums({ beats, size, pulse, showNumbers, reduced, disabled, maskStrong, onTap }: DrumsProps) {
  return (
    <div role="group" aria-label="Compàs" className="flex max-w-md flex-wrap items-center justify-center gap-3">
      {beats.map((beat, i) => {
        const isStrong = strong(beat, size)
        const lit = i === pulse
        return (
          <motion.button
            key={beat}
            type="button"
            disabled={disabled}
            aria-label={isStrong ? (maskStrong ? 'Batec fort final' : `Batec fort ${beat}`) : `Batec suau ${beat}`}
            whileTap={reduced ? undefined : { scale: 0.88 }}
            onClick={() => onTap(beat)}
            className={`sticker grid size-16 place-items-center rounded-full text-2xl font-bold text-ink disabled:opacity-60 ${
              isStrong ? 'bg-sol ring-4 ring-brand' : 'bg-cel'
            } ${lit && !reduced ? 'scale-110' : ''}`}
          >
            {isStrong && maskStrong ? '?' : showNumbers || isStrong ? beat : '·'}
          </motion.button>
        )
      })}
    </div>
  )
}
