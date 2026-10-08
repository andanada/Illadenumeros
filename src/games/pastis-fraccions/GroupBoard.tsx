import { motion, useReducedMotion } from 'motion/react'
import { Cupcake } from '../../ui/visual/Treats'
import { groupSize } from './sliceLogic'

const ITEM_PX = 30
const PER_ROW = 5

export interface GroupBoardProps {
  total: number
  parts: number
  /** False: all the cupcakes sit in one tray; true: they are shared in equal groups. */
  dealt: boolean
  /** Groups already painted (0-based). */
  picked: readonly number[]
  onGroup: (index: number) => void
}

function Tray({ total }: { total: number }) {
  return (
    <div role="img" aria-label={`${total} magdalenes per repartir`} className="flex max-w-md flex-wrap items-center justify-center gap-1 rounded-3xl border-4 border-dashed border-brand/40 bg-white/70 p-3">
      {Array.from({ length: total }, (_, i) => (
        <Cupcake key={i} size={ITEM_PX + 8} tone={i % 4} />
      ))}
    </div>
  )
}

/** A collection shared in equal groups; tapping a group paints it (the groups the fraction asks for). */
export function GroupBoard({ total, parts, dealt, picked, onGroup }: GroupBoardProps) {
  const reduce = useReducedMotion() ?? false
  if (!dealt) return <Tray total={total} />
  const size = groupSize(total, parts)
  return (
    <div role="group" aria-label={`${total} magdalenes repartides en ${parts} grups iguals`} className="flex max-w-xl flex-wrap items-center justify-center gap-3">
      {Array.from({ length: parts }, (_, g) => {
        const on = picked.includes(g)
        return (
          <motion.button
            key={g}
            type="button"
            aria-pressed={on}
            aria-label={`Grup ${g + 1}: ${size} magdalenes, ${on ? 'pintat' : 'sense pintar'}`}
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: reduce ? 0 : g * 0.12, type: 'spring', stiffness: 320, damping: 16 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onGroup(g)}
            style={{ width: Math.min(size, PER_ROW) * (ITEM_PX + 2) + 28 }}
            className={`flex min-h-16 flex-wrap items-center justify-center rounded-3xl border-4 p-2 ${on ? 'sticker border-white bg-chicle/30' : 'border-dashed border-ink/30 bg-white/70'}`}
          >
            {Array.from({ length: size }, (_, i) => (
              <Cupcake key={i} size={ITEM_PX} tone={on ? 0 : 1} faded={!on} />
            ))}
          </motion.button>
        )
      })}
    </div>
  )
}
