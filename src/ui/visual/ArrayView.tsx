import { motion, useReducedMotion } from 'motion/react'
import { UNIT, type VisualSize } from './shared'
import { Cupcake, frostingColor } from './Treats'

const MAX_ROWS = 50
const MAX_COLS = 20
/** Above this many items the cupcakes become plain counters so big arrays (23 x 4) stay readable. */
const COMPACT_FROM = 60

const clamp = (n: number, max: number): number => Math.min(max, Math.max(1, Math.floor(n)))

/** Rows x columns of cupcakes on a baking tray; each row has its own frosting colour. */
export function ArrayView({ rows, cols, size, animate }: { rows: number; cols: number; size: VisualSize; animate: boolean }) {
  const reduce = useReducedMotion() ?? false
  const moving = animate && !reduce
  const r = clamp(rows, MAX_ROWS)
  const c = clamp(cols, MAX_COLS)
  const compact = r * c > COMPACT_FROM
  const cell = compact ? Math.round(UNIT[size] * 0.7) : Math.round(UNIT[size] * 1.45)
  return (
    <figure
      role="img"
      aria-label={`${r} files de ${c} ${compact ? 'fitxes' : 'magdalenes'}, ${r * c} en total`}
      className="m-0 flex max-w-full flex-col items-center gap-1 rounded-3xl bg-white/70 p-3 ring-2 ring-brand-soft"
    >
      <div className="rounded-2xl border-4 border-dashed border-brand/30 bg-sol/10 p-1.5" style={{ width: `min(100%, ${c * cell + 24}px)` }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${c}, minmax(0, 1fr))` }}>
          {Array.from({ length: r * c }, (_, i) => (
            <motion.span
              key={i}
              initial={moving && !compact ? { scale: 0.3, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: moving ? Math.min(i, 40) * 0.03 : 0, type: 'spring', stiffness: 380, damping: 16 }}
              className="grid aspect-square place-items-center"
            >
              {compact ? (
                <span className="block size-3/4 rounded-full border-2 border-white shadow-sm" style={{ background: frostingColor(Math.floor(i / c)) }} />
              ) : (
                <Cupcake size="100%" tone={Math.floor(i / c)} />
              )}
            </motion.span>
          ))}
        </div>
      </div>
      <figcaption className="text-base font-semibold text-ink/60">
        {r} {r === 1 ? 'fila' : 'files'} · {c} {c === 1 ? 'columna' : 'columnes'}
      </figcaption>
    </figure>
  )
}
