import { motion, useReducedMotion } from 'motion/react'
import { formatEuros, pieceLabel, sumCents } from './moneyLogic'
import { MoneyPiece } from './MoneyPiece'
import { UNIT, type VisualSize } from './shared'

const MAX_PIECES = 24

/** Euro coins and notes laid out on a mat, with the total as a sticker. */
export function MoneyView({ coins, size, animate }: { coins: readonly number[]; size: VisualSize; animate: boolean }) {
  const reduce = useReducedMotion() ?? false
  const moving = animate && !reduce
  const pieces = coins.filter((c) => Number.isFinite(c) && c > 0).slice(0, MAX_PIECES)
  const total = sumCents(pieces)
  const names = pieces.map(pieceLabel).join(', ')
  return (
    <div
      role="img"
      aria-label={pieces.length === 0 ? 'Cap moneda' : `Monedes i bitllets: ${names}. Total: ${formatEuros(total)}`}
      className="flex max-w-xl flex-col items-center gap-2 rounded-3xl bg-white/70 p-3 ring-2 ring-brand-soft"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        {pieces.map((cents, i) => (
          <motion.span
            key={i}
            initial={moving ? { scale: 0.3, opacity: 0, rotate: -20 } : false}
            animate={{ scale: 1, opacity: 1, rotate: ((i * 7) % 11) - 5 }}
            transition={{ delay: moving ? i * 0.06 : 0, type: 'spring', stiffness: 380, damping: 16 }}
            className="inline-flex"
          >
            <MoneyPiece cents={cents} size={UNIT[size] * 1.6} />
          </motion.span>
        ))}
      </div>
      {pieces.length > 1 && <span className="sticker rounded-full bg-sol px-4 py-1 text-xl font-bold text-ink">{formatEuros(total)}</span>}
    </div>
  )
}
