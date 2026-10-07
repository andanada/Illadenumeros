import { motion } from 'motion/react'
import type { CellKind } from '../shared/TenFrameGrid'

const FILL: Record<CellKind, string> = {
  empty: '',
  ghost: 'bg-sol/30',
  c1: 'bg-chicle',
  c2: 'bg-cel',
  crossed: 'bg-chicle/35',
}

export interface CounterFrameProps {
  /** 20 cells for the whole board; this frame shows `offset`..`offset+9`. */
  cells: readonly CellKind[]
  offset: 0 | 10
  /** Ordinal labels (1-based) by absolute cell index, when counting. */
  ordinals: Readonly<Record<number, number>>
  tappable: boolean
  onCellTap: (index: number) => void
  highlight: boolean
}

/** One interactive 2x5 ten-frame. Counters spring into their cell. */
export function CounterFrame({ cells, offset, ordinals, tappable, onCellTap, highlight }: CounterFrameProps) {
  return (
    <div
      className={`grid grid-cols-5 gap-1.5 rounded-3xl border-4 bg-brand-soft p-2 transition-colors ${
        highlight ? 'border-chicle' : 'border-brand'
      }`}
    >
      {cells.slice(offset, offset + 10).map((kind, i) => {
        const index = offset + i
        const filled = kind !== 'empty'
        const label = `Casella ${index + 1}${filled ? (kind === 'crossed' ? ', fitxa treta' : ', amb fitxa') : ', buida'}`
        return (
          <button
            key={index}
            type="button"
            aria-label={label}
            disabled={!tappable || !filled}
            onClick={() => onCellTap(index)}
            className="grid size-14 place-items-center rounded-xl border-2 border-brand/30 bg-white/70 disabled:cursor-default sm:size-16"
          >
            {filled && (
              <motion.span
                key={kind}
                initial={{ scale: 0.2, y: -18 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 14 }}
                className={`sticker-pressed relative grid size-[85%] place-items-center rounded-full border-[3px] border-white text-xl font-bold text-white ${FILL[kind]}`}
              >
                {kind === 'crossed' ? '✕' : ordinals[index]}
              </motion.span>
            )}
          </button>
        )
      })}
    </div>
  )
}
