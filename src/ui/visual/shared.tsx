export type VisualSize = 'sm' | 'md' | 'lg'

/** Base unit in px for every size; each renderer scales from it. */
export const UNIT: Record<VisualSize, number> = { sm: 22, md: 32, lg: 42 }

export const PALETTE = {
  a: '#ff4fa3',
  b: '#6ec1ff',
  c: '#ffd23f',
  d: '#5eead4',
  ink: '#2a1b3d',
} as const

export const GROUP_COLORS = [PALETTE.a, PALETTE.b, PALETTE.c, PALETTE.d] as const

export function groupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length] ?? PALETTE.a
}

/** A round vinyl counter: white die-cut edge, soft shine. */
export function Counter({
  cx,
  cy,
  r,
  color,
  faded = false,
  crossed = false,
}: {
  cx: number
  cy: number
  r: number
  color: string
  faded?: boolean
  crossed?: boolean
}) {
  return (
    <g opacity={faded ? 0.38 : 1}>
      <circle cx={cx} cy={cy + r * 0.12} r={r} fill="#2a1b3d" opacity="0.14" />
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="#fff" strokeWidth={r * 0.22} />
      <ellipse cx={cx - r * 0.32} cy={cy - r * 0.38} rx={r * 0.26} ry={r * 0.16} fill="#fff" opacity="0.65" transform={`rotate(-30 ${cx - r * 0.32} ${cy - r * 0.38})`} />
      {crossed && (
        <path
          d={`M${cx - r * 0.5} ${cy} L${cx + r * 0.5} ${cy}`}
          stroke={PALETTE.ink}
          strokeWidth={r * 0.22}
          strokeLinecap="round"
        />
      )}
    </g>
  )
}

/** Builds [x, y] grid positions, `cols` per row, centred on cell centres. */
export function gridPositions(count: number, cols: number, cell: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    x: (i % cols) * cell + cell / 2,
    y: Math.floor(i / cols) * cell + cell / 2,
  }))
}
