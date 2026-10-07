import { motion, useReducedMotion } from 'motion/react'
import { collectionGroups, slicePath } from './shareLogic'
import { PALETTE, UNIT, type VisualSize } from './shared'
import { Cupcake } from './Treats'

const MAX_PARTS = 12
const MAX_COLLECTION = 36
const WHOLE_CIRCLE = 'M 10 50 a 40 40 0 1 0 80 0 a 40 40 0 1 0 -80 0 Z'

function Pizza({ parts, selected, px, moving }: { parts: number; selected: number; px: number; moving: boolean }) {
  const step = (Math.PI * 2) / parts
  return (
    <svg width={px} height={px} viewBox="0 0 100 100" aria-hidden="true" className="drop-shadow-sm">
      <circle cx="50" cy="50" r="47" fill="#e8b27d" stroke="#fff" strokeWidth="4" />
      {Array.from({ length: parts }, (_, i) => {
        const on = i < selected
        return (
          <motion.path
            key={i}
            d={parts === 1 ? WHOLE_CIRCLE : slicePath(50, 50, 40, i * step, (i + 1) * step)}
            fill={on ? PALETTE.a : '#fff3d6'}
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinejoin="round"
            initial={moving && on ? { opacity: 0.2 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: moving ? i * 0.12 : 0 }}
          />
        )
      })}
      {Array.from({ length: Math.min(parts, selected) }, (_, i) => {
        const a = (i + 0.5) * step
        return <circle key={i} cx={50 + 24 * Math.sin(a)} cy={50 - 24 * Math.cos(a)} r="4" fill="#fff" opacity="0.8" />
      })}
    </svg>
  )
}

export interface FractionViewProps {
  parts: number
  selected: number
  collection?: number | undefined
  size: VisualSize
  animate: boolean
}

/** A pizza cut in equal parts with `selected` coloured; or, with `collection`, items in equal groups. */
export function FractionView({ parts, selected, collection, size, animate }: FractionViewProps) {
  const reduce = useReducedMotion() ?? false
  const moving = animate && !reduce
  const p = Math.min(MAX_PARTS, Math.max(1, Math.floor(parts)))
  const s = Math.min(p, Math.max(0, Math.floor(selected)))
  if (collection !== undefined && collection > 0) {
    const n = Math.min(MAX_COLLECTION, Math.floor(collection))
    const { groupSize, highlighted } = collectionGroups(n, p, s)
    const cell = Math.round(UNIT[size] * 1.3)
    return (
      <div
        role="img"
        aria-label={`${s} de ${p} parts iguals de ${n} magdalenes: en pintem ${highlighted}`}
        className="flex max-w-xl flex-wrap items-center justify-center gap-3 rounded-3xl bg-white/70 p-3 ring-2 ring-brand-soft"
      >
        {Array.from({ length: p }, (_, g) => (
          <div
            key={g}
            className={`flex flex-wrap items-center justify-center rounded-2xl border-4 border-dashed p-1 ${g < s ? 'border-chicle bg-chicle/15' : 'border-ink/20'}`}
            style={{ width: Math.min(groupSize, 4) * cell + 16 }}
          >
            {Array.from({ length: groupSize }, (_, i) => (
              <Cupcake key={i} size={cell} tone={g < s ? 0 : 1} faded={g >= s} />
            ))}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div role="img" aria-label={`Una pizza tallada en ${p} parts iguals, amb ${s} pintades`} className="flex flex-col items-center gap-1 rounded-3xl bg-white/70 p-3 ring-2 ring-brand-soft">
      <Pizza parts={p} selected={s} px={Math.round(UNIT[size] * 4.2)} moving={moving} />
      <span aria-hidden="true" className="text-2xl font-bold text-brand-dark">
        {s}/{p}
      </span>
    </div>
  )
}
