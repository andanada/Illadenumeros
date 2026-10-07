import { useDraggable, useDroppable } from '@dnd-kit/core'
import { motion } from 'motion/react'
import { Cupcake } from '../../ui/visual/Treats'
import { splitColumns } from './trayLogic'

export const TRAY_DROP_ID = 'tray'
const PIECE = 72

export interface BakingTrayProps {
  rows: number
  cols: number
  placed: number
  /** Highlights the strategy split (e.g. 5 + 2 columns) with two colours. */
  showSplit: boolean
  highlight: boolean
}

/** The baking tray: a rows x cols grid; cupcakes snap into the next free slot, row by row. */
export function BakingTray({ rows, cols, placed, showSplit, highlight }: BakingTrayProps) {
  const { setNodeRef } = useDroppable({ id: TRAY_DROP_ID })
  const split = showSplit ? splitColumns(cols) : undefined
  const cell = Math.max(28, Math.min(64, Math.floor(300 / cols)))
  return (
    <div
      ref={setNodeRef}
      role="img"
      aria-label={`Safata de ${rows} files de ${cols}: ${placed} magdalenes posades`}
      className={`rounded-[2rem] border-[6px] border-dashed bg-white/80 p-2 transition-colors ${highlight ? 'border-sol bg-sol/20' : 'border-brand/40'}`}
    >
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)` }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const col = i % cols
          const tone = split ? (col < split[0] ? 0 : 1) : Math.floor(i / cols)
          const filled = i < placed
          return (
            <div key={i} className="grid place-items-center rounded-lg bg-brand-soft/60" style={{ width: cell, height: cell }}>
              {filled && (
                <motion.span
                  initial={{ scale: 0.4, y: -14 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                  className="block"
                >
                  <Cupcake size={cell - 2} tone={tone} />
                </motion.span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BasketCupcake({ id, tone, onTap }: { id: string; tone: number; onTap: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label="Magdalena. Arrossega-la a la safata o toca-la"
      onClick={onTap}
      {...attributes}
      {...listeners}
      style={{ width: PIECE, height: PIECE }}
      className={`grid touch-none place-items-center rounded-full ${isDragging ? 'opacity-30' : 'cursor-grab'}`}
    >
      <Cupcake size={PIECE - 6} tone={tone} />
    </button>
  )
}

/** Basket with the cupcakes still to bake (at most one row visible, plus a counter). */
export function Basket({ remaining, perRow, tone, onPlace }: { remaining: number; perRow: number; tone: number; onPlace: () => void }) {
  const visible = Math.min(remaining, Math.max(1, Math.min(perRow, 5)))
  return (
    <div role="group" aria-label={`Cistella amb ${remaining} magdalenes`} className="flex min-h-24 flex-wrap items-center justify-center gap-1 rounded-3xl border-4 border-dashed border-brand/40 bg-white/60 p-2">
      {Array.from({ length: visible }, (_, i) => (
        <BasketCupcake key={`${remaining}-${i}`} id={`cup-${i}`} tone={tone} onTap={onPlace} />
      ))}
      {remaining > visible && <span className="rounded-full bg-sol px-3 py-1 text-xl font-bold">+{remaining - visible}</span>}
    </div>
  )
}
