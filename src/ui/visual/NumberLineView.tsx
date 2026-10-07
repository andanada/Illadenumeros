import { motion, useReducedMotion } from 'motion/react'
import { PALETTE, type VisualSize } from './shared'

const WIDTH = 640
const PAD = 40
const LINE_Y = 100
const MAX_ARC = 70

const MAX_WIDTH: Record<VisualSize, number> = { sm: 360, md: 520, lg: 680 }

export function NumberLineView({
  from,
  to,
  start,
  target,
  size,
  animate,
}: {
  from: number
  to: number
  start: number
  target: number
  size: VisualSize
  animate: boolean
}) {
  const reduce = useReducedMotion() ?? false
  const moving = animate && !reduce
  const lo = Math.min(from, to)
  const hi = Math.max(from, to, lo + 1)
  const span = hi - lo
  const x = (n: number) => PAD + ((Math.min(hi, Math.max(lo, n)) - lo) / span) * (WIDTH - PAD * 2)
  const step = span <= 20 ? 1 : 10
  const ticks = Array.from({ length: Math.floor(span / step) + 1 }, (_, i) => lo + i * step)
  const sx = x(start)
  const tx = x(target)
  const mid = (sx + tx) / 2
  const arcH = Math.min(MAX_ARC, 28 + Math.abs(tx - sx) * 0.12)
  const hasHop = start !== target
  const labelled = new Set<number>([lo, hi, start, target])

  return (
    <svg
      viewBox={`0 0 ${WIDTH} 150`}
      width="100%"
      style={{ maxWidth: MAX_WIDTH[size] }}
      role="img"
      aria-label={`Recta numèrica del ${lo} al ${hi}. Comença al ${start} i arriba al ${target}.`}
    >
      <line x1={PAD - 14} y1={LINE_Y} x2={WIDTH - PAD + 14} y2={LINE_Y} stroke={PALETTE.ink} strokeWidth="6" strokeLinecap="round" />
      {ticks.map((n) => {
        const major = labelled.has(n) || n % 5 === 0
        return (
          <g key={n}>
            <line x1={x(n)} y1={LINE_Y - (major ? 14 : 9)} x2={x(n)} y2={LINE_Y + (major ? 14 : 9)} stroke={PALETTE.ink} strokeWidth={major ? 4 : 3} strokeLinecap="round" />
            {labelled.has(n) && (
              <text x={x(n)} y={LINE_Y + 42} textAnchor="middle" fontSize="26" fontWeight="700" fill={PALETTE.ink}>
                {n}
              </text>
            )}
          </g>
        )
      })}
      {hasHop && (
        <motion.path
          d={`M${sx} ${LINE_Y - 18} Q${mid} ${LINE_Y - 18 - arcH * 2} ${tx} ${LINE_Y - 18}`}
          fill="none"
          stroke={PALETTE.a}
          strokeWidth="5"
          strokeDasharray="2 12"
          strokeLinecap="round"
          initial={moving ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: 0.3 }}
        />
      )}
      <circle cx={sx} cy={LINE_Y} r="9" fill="#fff" stroke={PALETTE.ink} strokeWidth="3" />
      <motion.g
        initial={moving && hasHop ? { x: sx - tx } : false}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: 0.9, delay: 0.3, ease: 'easeInOut' }}
      >
        <circle cx={tx} cy={LINE_Y - 34} r="17" fill={PALETTE.a} stroke="#fff" strokeWidth="4" />
        <path d={`M${tx - 8} ${LINE_Y - 14} L${tx} ${LINE_Y - 4} L${tx + 8} ${LINE_Y - 14} Z`} fill={PALETTE.a} />
        <ellipse cx={tx - 5} cy={LINE_Y - 40} rx="4" ry="2.5" fill="#fff" opacity="0.7" />
      </motion.g>
    </svg>
  )
}
