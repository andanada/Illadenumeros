import { dist, type Pt } from './actorMachine'

/** Candidate offsets around the wanted spot, nearest first (a coarse grid out to about a third of the stage). */
const OFFSETS: ReadonlyArray<readonly [number, number]> = Array.from({ length: 15 * 7 }, (_, i): readonly [number, number] => [((i % 15) - 7) * 0.045, (Math.floor(i / 15) - 3) * 0.035]).sort(
  (a, b) => a[0] ** 2 + (a[1] * 1.4) ** 2 - (b[0] ** 2 + (b[1] * 1.4) ** 2),
)

const clampPt = (p: Pt): Pt => ({ x: Math.min(0.96, Math.max(0.04, p.x)), y: Math.min(0.96, Math.max(0.05, p.y)) })

/**
 * A spot near `want` that is at least `gap` away from every `taken` spot, so a dropped thing never hides
 * another. When the room is too crowded it returns the spot farthest from its neighbours.
 */
export function clearSpot(taken: readonly Pt[], want: Pt, snap: (p: Pt) => Pt, gap = 0.08): Pt {
  let best = snap(clampPt(want))
  let bestRoom = -1
  for (const [dx, dy] of OFFSETS) {
    const spot = snap(clampPt({ x: want.x + dx, y: want.y + dy }))
    const room = taken.length === 0 ? Infinity : Math.min(...taken.map((t) => dist(t, spot)))
    if (room >= gap) return spot
    if (room > bestRoom) {
      bestRoom = room
      best = spot
    }
  }
  return best
}
