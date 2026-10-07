import { motion } from 'motion/react'

export type CellKind = 'empty' | 'c1' | 'c2' | 'ghost' | 'crossed'

const CELL_STYLE: Record<CellKind, string> = {
  empty: 'bg-white/70',
  ghost: 'bg-sol/30 border-dashed border-sol',
  c1: 'bg-chicle',
  c2: 'bg-cel',
  crossed: 'bg-chicle/40',
}

/** Builds 10 cells: `first` of colour 1, then `second` of colour 2 (or ghost placeholders). */
export function buildCells(first: number, second: number, secondKind: CellKind = 'c2'): CellKind[] {
  return Array.from({ length: 10 }, (_, i) => (i < first ? 'c1' : i < first + second ? secondKind : 'empty'))
}

/** Presentational 2x5 ten-frame. */
export function TenFrameGrid({ cells, cell = 40, label }: { cells: readonly CellKind[]; cell?: number; label?: string }) {
  return (
    <div
      role="img"
      aria-label={label ?? 'Marc de deu'}
      className="grid grid-cols-5 gap-1.5 rounded-2xl border-4 border-brand bg-brand-soft p-2"
    >
      {cells.map((kind, i) => (
        <div key={i} style={{ width: cell, height: cell }} className="grid place-items-center rounded-lg border-2 border-brand/30">
          {kind !== 'empty' && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              style={{ width: cell - 8, height: cell - 8 }}
              className={`block rounded-full border-2 border-white ${CELL_STYLE[kind]}`}
            >
              {kind === 'crossed' && <span className="grid size-full place-items-center text-xl text-white/90">✕</span>}
            </motion.span>
          )}
        </div>
      ))}
    </div>
  )
}
