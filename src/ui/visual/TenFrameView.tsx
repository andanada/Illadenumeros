import { motion } from 'motion/react'
import { Counter, PALETTE, UNIT, type VisualSize } from './shared'

type Slot = { color: string; faded: boolean; crossed: boolean } | undefined

function buildSlots(a: number, b: number, op: '+' | '-'): Slot[] {
  const first = Math.max(0, Math.floor(a))
  const second = Math.max(0, Math.floor(b))
  if (op === '+') {
    const total = first + second
    return Array.from({ length: total }, (_, i): Slot =>
      i < first ? { color: PALETTE.a, faded: false, crossed: false } : { color: PALETTE.b, faded: false, crossed: false },
    )
  }
  const kept = Math.max(0, first - second)
  return Array.from({ length: first }, (_, i): Slot =>
    i < kept ? { color: PALETTE.a, faded: false, crossed: false } : { color: PALETTE.a, faded: true, crossed: true },
  )
}

function Frame({ slots, size, animate, offset }: { slots: Slot[]; size: VisualSize; animate: boolean; offset: number }) {
  const cell = UNIT[size] * 1.35
  const w = cell * 5
  const h = cell * 2
  return (
    <svg width={w + 8} height={h + 8} viewBox={`-4 -4 ${w + 8} ${h + 8}`} aria-hidden="true">
      <rect x="0" y="0" width={w} height={h} rx={cell * 0.2} fill="#fff" stroke="#2a1b3d" strokeOpacity="0.45" strokeWidth="3" />
      {Array.from({ length: 4 }, (_, i) => (
        <line key={`v${i}`} x1={(i + 1) * cell} y1="0" x2={(i + 1) * cell} y2={h} stroke="#2a1b3d" strokeOpacity="0.25" strokeWidth="2" />
      ))}
      <line x1="0" y1={cell} x2={w} y2={cell} stroke="#2a1b3d" strokeOpacity="0.25" strokeWidth="2" />
      {Array.from({ length: 10 }, (_, i) => {
        const slot = slots[i]
        if (!slot) return null
        const cx = (i % 5) * cell + cell / 2
        const cy = Math.floor(i / 5) * cell + cell / 2
        return (
          <motion.g
            key={i}
            initial={animate ? { scale: 0.3, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: animate ? (offset + i) * 0.06 : 0, type: 'spring', stiffness: 380, damping: 18 }}
            style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: 'view-box' }}
          >
            <Counter cx={cx} cy={cy} r={cell * 0.36} color={slot.color} faded={slot.faded} crossed={slot.crossed} />
          </motion.g>
        )
      })}
    </svg>
  )
}

/** One or two 2x5 ten-frames. Subtraction fades and strikes through the counters taken away. */
export function TenFrameView({ a, b, op, size, animate }: { a: number; b: number; op: '+' | '-'; size: VisualSize; animate: boolean }) {
  const slots = buildSlots(a, b, op)
  const frames = Math.max(1, Math.ceil(slots.length / 10))
  const label = op === '+' ? `Requadre del 10 amb ${a} i ${b} fitxes` : `Requadre del 10 amb ${a} fitxes, en traiem ${b}`
  return (
    <div className="flex flex-wrap items-center justify-center gap-4" role="img" aria-label={label}>
      {Array.from({ length: frames }, (_, f) => (
        <Frame key={f} slots={slots.slice(f * 10, f * 10 + 10)} size={size} animate={animate} offset={f * 10} />
      ))}
    </div>
  )
}
