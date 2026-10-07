import { useDraggable, useDroppable } from '@dnd-kit/core'
import { motion } from 'motion/react'
import { Candy, PlateShape, platePositions } from '../../ui/visual/Treats'

export const plateDropId = (index: number): string => `plate-${index}`
export const parsePlateId = (id: string | number): number | undefined => {
  const m = /^plate-(\d+)$/.exec(String(id))
  return m ? Number(m[1]) : undefined
}

const PLATE = 104
const CANDY = 34
const PIECE = 72

function Plate({ index, count, active, onTap }: { index: number; count: number; active: boolean; onTap: (index: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: plateDropId(index) })
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={`Plat ${index + 1}: ${count} llaminadures. Toca per afegir-hi una`}
      onClick={() => onTap(index)}
      style={{ width: PLATE, height: PLATE }}
      className="relative shrink-0 rounded-full"
    >
      <PlateShape size={PLATE} highlight={isOver || active} />
      {platePositions(count, PLATE).map((p, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0.3, y: -12 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 15 }}
          className="absolute"
          style={{ left: PLATE / 2 + p.x - CANDY / 2, top: PLATE / 2 + p.y - CANDY / 2 }}
        >
          <Candy size={CANDY} tone={index} />
        </motion.span>
      ))}
      <span aria-hidden="true" className="sticker absolute -bottom-2 -right-1 grid size-9 place-items-center rounded-full bg-sol text-xl font-bold text-ink">
        {count}
      </span>
    </button>
  )
}

/** The plates; each is a drop zone and also a button (tap = give one candy). */
export function PlatesBoard({ plates, dragging, onTap }: { plates: readonly number[]; dragging: boolean; onTap: (index: number) => void }) {
  const min = Math.min(...plates)
  return (
    <div role="group" aria-label={`${plates.length} plats`} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-5 p-2">
      {plates.map((count, i) => (
        <Plate key={i} index={i} count={count} active={dragging && count === min} onTap={onTap} />
      ))}
    </div>
  )
}

function PoolCandy({ id, tone, onTap }: { id: string; tone: number; onTap: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label="Llaminadura. Arrossega-la a un plat o toca-la"
      onClick={onTap}
      {...attributes}
      {...listeners}
      style={{ width: PIECE, height: PIECE }}
      className={`grid touch-none place-items-center rounded-full ${isDragging ? 'opacity-30' : 'cursor-grab'}`}
    >
      <Candy size={PIECE - 8} tone={tone} />
    </button>
  )
}

/** Candies still to share (a handful visible + counter) or, once everything is shared, the leftovers "sobren". */
export function CandyPool({ remaining, shared, onDeal }: { remaining: number; shared: boolean; onDeal: () => void }) {
  const visible = Math.min(remaining, 5)
  const label = shared ? (remaining === 0 ? 'No en sobra cap' : `Sobren ${remaining} llaminadures`) : `Cistella amb ${remaining} llaminadures`
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex min-h-24 flex-wrap items-center justify-center gap-1 rounded-3xl border-4 border-dashed p-2 ${shared ? 'border-almost/60 bg-almost/10' : 'border-brand/40 bg-white/60'}`}
    >
      {shared && <span className="px-2 text-xl font-bold text-almost">{remaining === 0 ? 'No en sobra cap' : 'sobren'}</span>}
      {Array.from({ length: visible }, (_, i) => (
        shared ? <Candy key={i} size={PIECE - 20} tone={i} /> : <PoolCandy key={`${remaining}-${i}`} id={`candy-${i}`} tone={i} onTap={onDeal} />
      ))}
      {remaining > visible && <span className="rounded-full bg-sol px-3 py-1 text-xl font-bold">+{remaining - visible}</span>}
    </div>
  )
}
