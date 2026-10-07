import { useDraggable, useDroppable } from '@dnd-kit/core'
import { motion } from 'motion/react'
import { formatEuros, isNote, pieceLabel } from '../../ui/visual/moneyLogic'
import { MoneyPiece } from '../../ui/visual/MoneyPiece'

export const COUNTER_DROP_ID = 'taulell'

const COIN_BASE = 92
const NOTE_BASE = 72

const pieceBase = (cents: number): number => (isNote(cents) ? NOTE_BASE : COIN_BASE)

function PursePiece({ id, cents, onTap }: { id: string; cents: number; onTap: (cents: number) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { cents } })
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={`${isNote(cents) ? 'Bitllet' : 'Moneda'} de ${pieceLabel(cents)}. Arrossega-la al taulell o toca-la`}
      onClick={() => onTap(cents)}
      {...attributes}
      {...listeners}
      className={`grid min-h-[72px] min-w-[72px] touch-none place-items-center rounded-2xl p-0.5 ${isDragging ? 'opacity-30' : 'cursor-grab'}`}
    >
      <MoneyPiece cents={cents} size={pieceBase(cents)} />
    </button>
  )
}

/** The purse: a tray of coins and notes. Dragging or tapping a piece puts a copy on the counter. */
export function Purse({ pieces, onAdd }: { pieces: readonly number[]; onAdd: (cents: number) => void }) {
  return (
    <div role="group" aria-label="Cartera" className="flex max-w-xl flex-wrap items-center justify-center gap-1 rounded-3xl border-4 border-dashed border-brand/40 bg-white/60 p-2">
      {pieces.map((cents, i) => (
        <PursePiece key={`${cents}-${i}`} id={`purse-${i}`} cents={cents} onTap={onAdd} />
      ))}
    </div>
  )
}

/** Shop counter with an awning; the pieces dropped here add up to the running total. */
export function ShopCounter({ pieces, total, highlight, onRemove }: { pieces: readonly number[]; total: number; highlight: boolean; onRemove: (index: number) => void }) {
  const { setNodeRef } = useDroppable({ id: COUNTER_DROP_ID })
  return (
    <div ref={setNodeRef} className={`w-full max-w-xl rounded-[2rem] border-[6px] border-dashed p-2 transition-colors ${highlight ? 'border-sol bg-sol/20' : 'border-brand/40 bg-white/80'}`}>
      <svg viewBox="0 0 200 24" width="100%" height="24" aria-hidden="true" className="mb-1">
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M ${i * 25} 0 H ${i * 25 + 25} V 14 Q ${i * 25 + 12.5} 30 ${i * 25} 14 Z`} fill={i % 2 === 0 ? '#6ec1ff' : '#fff'} stroke="#2a1b3d" strokeOpacity="0.2" />
        ))}
      </svg>
      <div role="group" aria-label="Taulell de la botiga" className="flex min-h-20 flex-wrap items-center justify-center gap-1">
        {pieces.map((cents, i) => (
          <motion.button
            key={`${cents}-${i}`}
            type="button"
            aria-label={`Treu ${pieceLabel(cents)}`}
            initial={{ scale: 0.5, y: -16 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            onClick={() => onRemove(i)}
            className="grid min-h-16 min-w-16 place-items-center rounded-2xl"
          >
            <MoneyPiece cents={cents} size={isNote(cents) ? 44 : 56} />
          </motion.button>
        ))}
        {pieces.length === 0 && <span className="text-xl font-semibold text-ink/50">Taulell buit</span>}
      </div>
      <p aria-live="polite" aria-label={`Total: ${formatEuros(total)}`} className="sticker mx-auto mt-1 w-fit rounded-full bg-sol px-6 py-1 text-3xl font-bold text-ink">
        {formatEuros(total)}
      </p>
    </div>
  )
}
