import { motion } from 'motion/react'

/** Round progress as stickers (never numbers): filled stars for done rounds, soft outlines for the rest. */
export function StickerTrail({ done, total, label }: { done: number; total: number; label: string }) {
  const shown = Math.min(total, 12)
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label={label}>
      {Array.from({ length: shown }, (_, i) => {
        const filled = i < done
        return (
          <li key={i} className="grid size-9 place-items-center">
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={filled ? { scale: [0.4, 1.25, 1], rotate: [-20, 8, -4] } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.4 }}
              className={filled ? 'sticker grid size-9 place-items-center rounded-full bg-sol text-lg' : 'grid size-8 place-items-center rounded-full border-4 border-dashed border-brand/40 bg-white/60'}
            >
              {filled ? '⭐' : ''}
            </motion.span>
          </li>
        )
      })}
    </ol>
  )
}

export function PetalCounter({ petals }: { petals: number }) {
  return (
    <p className="sticker flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xl font-bold text-chicle sm:px-4 sm:py-2 sm:text-2xl" aria-label={`${petals} pètals`}>
      <span aria-hidden="true">🌸</span>
      <span className="tabular-nums">{petals}</span>
    </p>
  )
}
