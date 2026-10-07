import { motion, useReducedMotion } from 'motion/react'
import type { Bubble } from './bubbleField'

const TINTS = [
  'radial-gradient(circle at 30% 28%, #fff 0 12%, #ffd6ec 30%, #ff9fd0 100%)',
  'radial-gradient(circle at 30% 28%, #fff 0 12%, #d3efff 30%, #8fd0ff 100%)',
  'radial-gradient(circle at 30% 28%, #fff 0 12%, #d5fff7 30%, #7be8d5 100%)',
  'radial-gradient(circle at 30% 28%, #fff 0 12%, #fff1b8 30%, #ffd23f 100%)',
] as const

export interface BubbleViewProps {
  bubble: Bubble
  selected: boolean
  highlighted: boolean
  /** Increments on a wrong pair to trigger the soft bounce. */
  bounceKey: number
  disabled: boolean
  onTap: (bubble: Bubble) => void
}

/** A floating soap-bubble sticker with a big number. Drifts gently; no timer, no pressure. */
export function BubbleView({ bubble, selected, highlighted, bounceKey, disabled, onTap }: BubbleViewProps) {
  const reduced = useReducedMotion()
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${bubble.x}%`, top: `${bubble.y}%` }}>
      <motion.div
        animate={reduced ? undefined : { y: [0, -9, 0], x: [0, 4, 0] }}
        transition={{ duration: 3.2 + bubble.phase, repeat: Infinity, ease: 'easeInOut', delay: bubble.phase * 0.3 }}
      >
        <motion.button
          key={bounceKey}
          type="button"
          disabled={disabled}
          aria-pressed={selected}
          aria-label={`Bombolla ${bubble.value}`}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: selected ? 1.18 : 1, rotate: 0, y: bounceKey > 0 && !selected ? [0, -14, 0] : 0 }}
          exit={{ scale: 0, opacity: 0, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', stiffness: 380, damping: 14 }}
          whileTap={{ scale: 0.88 }}
          onClick={() => onTap(bubble)}
          style={{ background: TINTS[bubble.hue % TINTS.length] as string }}
          className={`sticker relative grid size-24 place-items-center rounded-full text-5xl font-bold text-ink sm:size-28 sm:text-6xl ${
            selected ? 'ring-8 ring-sol' : highlighted ? 'ring-8 ring-chicle/60' : ''
          }`}
        >
          {bubble.value}
          <span aria-hidden="true" className="pointer-events-none absolute left-[18%] top-[14%] h-[14%] w-[26%] rotate-[-30deg] rounded-full bg-white/80" />
        </motion.button>
      </motion.div>
    </div>
  )
}
