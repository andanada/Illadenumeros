import type { Pt } from '../../../sandbox/logic/actorMachine'
import type { Rect } from '../../../sandbox/logic/zones'

const MAX_ROWS = 4
const PER_ROW = 6

/** The middle of an area: where things made on the spot appear. */
export const centreOf = (area: Rect): Pt => ({ x: area.x + area.w / 2, y: area.y + area.h / 2 })

/**
 * A loose pile that fills `area` evenly: a few rows (up to four), as many columns as needed, the rows a little
 * staggered so it looks poured out, not printed. Deterministic. y is the feet of the piece (the bottom of its cell).
 */
export function pileSpots(n: number, area: Rect): readonly Pt[] {
  if (n <= 0) return []
  const rows = Math.min(MAX_ROWS, Math.ceil(n / PER_ROW))
  const cols = Math.ceil(n / rows)
  const dx = area.w / cols
  const dy = area.h / rows
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    const stagger = row % 2 === 1 ? dx * 0.35 : 0
    return { x: Math.min(0.97, area.x + dx * (col + 0.5) + stagger), y: Math.min(0.97, area.y + dy * (row + 0.9)) }
  })
}
