import { PALETTE, type VisualSize } from './shared'

const SIDE = 10
const CELL: Record<VisualSize, number> = { sm: 12, md: 17, lg: 22 }

/** Hundred square: `filled` of its 100 squares coloured, row by row (10 per row = one tenth each). */
export function HundredGridView({ filled, size }: { filled: number; size: VisualSize }) {
  const n = Math.min(100, Math.max(0, Math.floor(filled)))
  const cell = CELL[size]
  const px = cell * SIDE
  return (
    <svg
      role="img"
      aria-label={`Quadrat de 100 caselles amb ${n} pintades`}
      width={px + 6}
      height={px + 6}
      viewBox={`-3 -3 ${px + 6} ${px + 6}`}
      className="rounded-xl bg-white/70 drop-shadow-sm"
    >
      {Array.from({ length: SIDE * SIDE }, (_, i) => (
        <rect
          key={i}
          x={(i % SIDE) * cell}
          y={Math.floor(i / SIDE) * cell}
          width={cell - 1}
          height={cell - 1}
          rx={2}
          fill={i < n ? PALETTE.a : '#fff3d6'}
          stroke={PALETTE.ink}
          strokeOpacity={0.25}
          strokeWidth={0.8}
        />
      ))}
    </svg>
  )
}
