import type { HotRect } from './logic/layers'
import { depthScale, stackOf } from './StageContext'
import type { DoorDef, SeatDef, SurfaceDef } from './types'

/** Where the seats, doors and spots are drawn (fractions of the stage) and at which z-index; Hotspots uses the same numbers. */
export function hotRects(seats: readonly SeatDef[], doors: readonly DoorDef[], surfaces: readonly SurfaceDef[], size: { w: number; h: number }, floorTop: number): readonly HotRect[] {
  const { w, h } = size
  const seatRects = seats.map((s): HotRect => {
    const bw = Math.max(44, Math.min(w * 0.2, 150) * depthScale(s.at.y, floorTop))
    const bh = Math.max(44, h * 0.09)
    return { x: s.at.x - bw / 2 / w, y: s.at.y - (bh * 0.78) / h, w: bw / w, h: bh / h, z: stackOf(s.at.y) - 1 }
  })
  const doorRects = doors.map((d): HotRect => {
    const box = d.box ?? { w: 0.13, h: 0.38 }
    return { x: d.at.x - box.w / 2, y: d.at.y - box.h, w: box.w, h: box.h, z: stackOf(d.at.y) - 2 }
  })
  const spot = Math.max(48, h * 0.11)
  const surfaceRects = surfaces.map((s): HotRect => ({ x: s.at.x - spot / 2 / w, y: s.at.y - spot / 2 / h, w: spot / w, h: spot / h, z: stackOf(s.at.y) + 3 }))
  return [...doorRects, ...seatRects, ...surfaceRects]
}
