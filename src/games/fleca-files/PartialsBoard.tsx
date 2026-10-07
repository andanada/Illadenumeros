import { motion } from 'motion/react'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { BlocksView } from '../../ui/visual/BlocksView'
import { partialProducts, toBlocks } from './trayLogic'

export interface PartialsBoardProps {
  a: number
  b: number
  /** Which of the two partial products are already revealed. */
  revealed: readonly [boolean, boolean]
  onReveal: (index: 0 | 1) => void
}

/** 2-digit x 1-digit: two sticker trays, tap each to bake its partial product with blocks. */
export function PartialsBoard({ a, b, revealed, onReveal }: PartialsBoardProps) {
  const parts = partialProducts(a, b)
  return (
    <div className="flex flex-wrap items-stretch justify-center gap-4" role="group" aria-label={`Productes parcials de ${a} × ${b}`}>
      {parts.map((part, i) => {
        const index = i as 0 | 1
        const open = revealed[index]
        const blocks = toBlocks(part.value)
        return (
          <motion.button
            key={part.label}
            type="button"
            disabled={open}
            aria-label={open ? `${part.label} = ${part.value}` : `Calcula ${part.label}`}
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              unlockAudio()
              sfx.pop()
              onReveal(index)
            }}
            style={{ rotate: i === 0 ? -1.5 : 1.5 }}
            className={`sticker flex min-h-24 min-w-40 flex-col items-center justify-center gap-2 rounded-[1.6rem] p-3 ${open ? 'bg-white' : 'bg-sol'}`}
          >
            <span className="text-3xl font-bold text-brand-dark">{open ? `${part.label} = ${part.value}` : `${part.label} = ?`}</span>
            {open && <BlocksView {...blocks} size="sm" animate />}
          </motion.button>
        )
      })}
    </div>
  )
}
