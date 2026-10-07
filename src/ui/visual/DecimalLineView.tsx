import { PALETTE, type VisualSize } from './shared'

const WIDTH = 640
const PAD = 40
const LINE_Y = 90
const MAX_WIDTH: Record<VisualSize, number> = { sm: 360, md: 520, lg: 680 }

/** Number line from one whole number to the next, cut in 10 tenths, with an arrow at `target` (hundredths). */
export function DecimalLineView({ from, to, target, size }: { from: number; to: number; target: number; size: VisualSize }) {
  const lo = Math.min(from, to)
  const hi = Math.max(to, lo + 1)
  const span = (hi - lo) * 10
  const x = (tenths: number): number => PAD + (tenths / span) * (WIDTH - PAD * 2)
  const arrowAt = Math.min(span, Math.max(0, (target - lo * 100) / 10))
  return (
    <svg viewBox={`0 0 ${WIDTH} 150`} width="100%" style={{ maxWidth: MAX_WIDTH[size] }} role="img" aria-label={`Recta numèrica del ${lo} al ${hi} tallada en dècimes, amb una fletxa`}>
      <line x1={PAD - 14} y1={LINE_Y} x2={WIDTH - PAD + 14} y2={LINE_Y} stroke={PALETTE.ink} strokeWidth="6" strokeLinecap="round" />
      {Array.from({ length: span + 1 }, (_, i) => {
        const major = i % 10 === 0
        return <line key={i} x1={x(i)} y1={LINE_Y - (major ? 16 : 10)} x2={x(i)} y2={LINE_Y + (major ? 16 : 10)} stroke={PALETTE.ink} strokeWidth={major ? 4 : 3} strokeLinecap="round" />
      })}
      {[lo, hi].map((n) => (
        <text key={n} x={x((n - lo) * 10)} y={LINE_Y + 46} textAnchor="middle" fontSize="28" fontWeight="700" fill={PALETTE.ink}>
          {n}
        </text>
      ))}
      <g>
        <circle cx={x(arrowAt)} cy={LINE_Y - 40} r="17" fill={PALETTE.a} stroke="#fff" strokeWidth="4" />
        <path d={`M${x(arrowAt) - 8} ${LINE_Y - 20} L${x(arrowAt)} ${LINE_Y - 8} L${x(arrowAt) + 8} ${LINE_Y - 20} Z`} fill={PALETTE.a} />
      </g>
    </svg>
  )
}
