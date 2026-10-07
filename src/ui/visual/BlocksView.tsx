import { motion } from 'motion/react'
import { PALETTE, UNIT, type VisualSize } from './shared'

const MAX_PIECES = 9

function Hundred({ u }: { u: number }) {
  const s = u * 10
  return (
    <svg width={s + 4} height={s + 4} viewBox={`-2 -2 ${s + 4} ${s + 4}`} aria-hidden="true">
      <rect width={s} height={s} rx={u * 0.5} fill={PALETTE.b} stroke="#fff" strokeWidth="3" />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i} stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5">
          <line x1={(i + 1) * u} y1="0" x2={(i + 1) * u} y2={s} />
          <line x1="0" y1={(i + 1) * u} x2={s} y2={(i + 1) * u} />
        </g>
      ))}
    </svg>
  )
}

function Ten({ u }: { u: number }) {
  const w = u * 1.8
  const h = u * 10
  return (
    <svg width={w + 4} height={h + 4} viewBox={`-2 -2 ${w + 4} ${h + 4}`} aria-hidden="true">
      <rect width={w} height={h} rx={u * 0.4} fill={PALETTE.d} stroke="#fff" strokeWidth="3" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1="0" y1={(i + 1) * u} x2={w} y2={(i + 1) * u} stroke="#fff" strokeOpacity="0.8" strokeWidth="1.5" />
      ))}
    </svg>
  )
}

function One({ u }: { u: number }) {
  const s = u * 1.8
  return (
    <svg width={s + 4} height={s + 4} viewBox={`-2 -2 ${s + 4} ${s + 4}`} aria-hidden="true">
      <rect width={s} height={s} rx={u * 0.4} fill={PALETTE.a} stroke="#fff" strokeWidth="3" />
      <rect x={s * 0.15} y={s * 0.15} width={s * 0.3} height={s * 0.18} rx="2" fill="#fff" opacity="0.6" />
    </svg>
  )
}

function Column({ count, label, children, animate, delay }: { count: number; label: string; children: React.ReactNode[]; animate: boolean; delay: number }) {
  if (count <= 0) return null
  return (
    <div className="flex flex-col items-center gap-1" role="group" aria-label={`${count} ${label}`}>
      <motion.div
        className="flex flex-wrap items-end justify-center gap-2"
        initial={animate ? { opacity: 0, y: -12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: animate ? delay : 0, type: 'spring', stiffness: 300, damping: 20 }}
      >
        {children}
      </motion.div>
    </div>
  )
}

/** Base-ten blocks: flat hundreds, tens bars and unit cubes in tidy columns. */
export function BlocksView({ hundreds, tens, ones, size, animate }: { hundreds: number; tens: number; ones: number; size: VisualSize; animate: boolean }) {
  const u = UNIT[size] * 0.3
  const clamp = (n: number) => Math.min(MAX_PIECES, Math.max(0, Math.floor(n)))
  const h = clamp(hundreds)
  const t = clamp(tens)
  const o = clamp(ones)
  return (
    <div className="flex flex-wrap items-end justify-center gap-x-6 gap-y-3 rounded-3xl bg-white/70 p-3 ring-2 ring-brand-soft" role="img" aria-label={`${h} centenes, ${t} desenes i ${o} unitats`}>
      <Column count={h} label="centenes" animate={animate} delay={0}>
        {Array.from({ length: h }, (_, i) => <Hundred key={i} u={u} />)}
      </Column>
      <Column count={t} label="desenes" animate={animate} delay={0.2}>
        {Array.from({ length: t }, (_, i) => <Ten key={i} u={u} />)}
      </Column>
      <Column count={o} label="unitats" animate={animate} delay={0.4}>
        {Array.from({ length: o }, (_, i) => <One key={i} u={u} />)}
      </Column>
    </div>
  )
}
