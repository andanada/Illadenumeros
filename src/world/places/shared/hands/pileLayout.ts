export interface Area {
  /** Fractions of the stage. `y0`..`y1` is the range where the FEET of the pieces stand. */
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

export interface Px {
  readonly w: number
  readonly h: number
}

export type Spot = { readonly x: number; readonly y: number }

/** Touch sizes tried from the best one down: a piece is at least this big (px) when the pile is laid out. */
export const HIT_STEPS: readonly number[] = [64, 56, 48, 44, 40, 36, 32, 28]

export interface Pile {
  readonly spots: readonly Spot[]
  /** The touch size the layout keeps free around each piece (px). */
  readonly hit: number
}

/**
 * Two pieces never hide each other's middle: pieces in one row are at least half a touch box apart sideways, and
 * rows are at least a whole box apart. With a 64 px box that is 33 px sideways and 64 px between rows, so every piece
 * can be touched on its own even on a phone. When the area is too small for that, the box shrinks step by step
 * (never below 28 px) until all the pieces fit. Deterministic.
 */
export function spreadPile(n: number, area: Area, stage: Px): Pile {
  if (n <= 0) return { spots: [], hit: HIT_STEPS[0] ?? 64 }
  const width = (area.x1 - area.x0) * stage.w
  const height = (area.y1 - area.y0) * stage.h
  const fits = (hit: number): { rows: number; cols: number } => ({ rows: Math.floor(height / hit) + 1, cols: Math.max(1, Math.floor(width / (hit / 2 + 1))) })
  const hit = HIT_STEPS.find((h) => {
    const f = fits(h)
    return f.rows * f.cols >= n
  }) ?? HIT_STEPS[HIT_STEPS.length - 1] ?? 28
  const cap = fits(hit)
  const rows = Math.min(cap.rows, Math.ceil(n / cap.cols))
  const perRow = Math.ceil(n / rows)
  const rowPitch = hit / stage.h
  const spots = Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / perRow)
    const col = i % perRow
    const inRow = Math.min(perRow, n - row * perRow)
    // Rows hang from the bottom of the area; each row is centred on its own.
    return { x: area.x0 + ((area.x1 - area.x0) * (col + 0.5 + (perRow - inRow) / 2)) / perRow, y: Math.min(area.y1, area.y1 - (rows - 1 - row) * rowPitch) }
  })
  return { spots, hit }
}
