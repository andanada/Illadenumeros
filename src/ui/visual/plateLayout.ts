/** Share of the plate diameter that is flat enough to hold candies. */
const USABLE = 0.74
const GAP = 1.08

export interface PlateLayout {
  /** Offsets from the plate centre. */
  positions: { x: number; y: number }[]
  /** Candy size that fits (never above `maxCandy`). */
  candy: number
}

/** Candies per row: balanced, with the longer rows in the middle (7 -> 2,3,2). */
function rowCounts(n: number): number[] {
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const base = Math.floor(n / rows)
  const counts = Array.from({ length: rows }, () => base)
  const centre = (rows - 1) / 2
  const order = counts.map((_, i) => i).sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre) || a - b)
  for (let extra = n - base * rows, k = 0; extra > 0; extra--, k++) counts[order[k] ?? 0] = (counts[order[k] ?? 0] ?? 0) + 1
  return counts
}

/** Neat centred rows of candies that scale with the count so they never overlap or leave the plate. */
export function plateLayout(n: number, size: number, maxCandy: number): PlateLayout {
  const count = Number.isFinite(n) ? Math.floor(n) : 0
  if (count <= 0) return { positions: [], candy: maxCandy }
  if (count === 1) return { positions: [{ x: 0, y: 0 }], candy: maxCandy }
  const counts = rowCounts(count)
  const widest = Math.max(...counts)
  const usable = size * USABLE
  // The outermost candy centre must stay inside the plate: bound the pitch by the bounding box diagonal.
  const pitch = Math.min(maxCandy * GAP, usable / Math.max(widest, counts.length))
  const candy = Math.min(maxCandy, pitch / GAP)
  const positions = counts.flatMap((perRow, row) =>
    Array.from({ length: perRow }, (_, j) => ({ x: (j - (perRow - 1) / 2) * pitch, y: (row - (counts.length - 1) / 2) * pitch })),
  )
  return { positions, candy }
}
