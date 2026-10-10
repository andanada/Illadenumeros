import { freshPointIn, type PointerTrack } from '../home/useLastPointer'
import { clampLocal, decode, defaultSpot, encodeX, type ZoneId } from './zones'

interface Box {
  left: number
  top: number
  width: number
  height: number
}

export interface DropInput {
  zone: ZoneId
  /** The zone's box on screen (it spans the whole height of its floor). */
  rect: Box
  track: PointerTrack
  now: number
  /** Moving a piece already placed: its saved position. Undefined = a new piece from the catalogue. */
  moving?: { uid: string; x: number; y: number } | undefined
  /** Pieces already in the zone (spreads keyboard placements). */
  count: number
  wall: boolean
}

/** A drag moved the finger at least this far (otherwise it was a tap). */
const DRAG_PX = 8
/** A tapped spot is where the piece's feet go, a little under the finger so it stands where she pointed. */
const FEET_BELOW = 0.06

/**
 * Where a dropped piece goes, as a saved position:
 * - dragged inside its own zone: moved by exactly the finger's travel (it does not jump under the finger);
 * - tap-to-place, a new piece, or another zone: stands where she tapped / let go;
 * - keyboard (no fresh finger position): stays put, or a free-ish spot for a new piece.
 */
export function dropSpot({ zone, rect, track, now, moving, count, wall }: DropInput): { x: number; y: number } {
  const last = freshPointIn(track.last, rect, now)
  if (!last) return moving ? { x: moving.x, y: moving.y } : defaultSpot(zone, count, wall)
  const down = track.down
  const dragged = down !== undefined && Math.hypot(last.x - down.x, last.y - down.y) >= DRAG_PX
  if (moving && dragged) {
    const from = decode(moving)
    if (from.zone === zone) {
      const local = clampLocal({ x: from.x + (last.x - down.x) / rect.width, y: from.y + (last.y - down.y) / rect.height })
      return { x: encodeX(zone, local.x), y: local.y }
    }
  }
  const local = clampLocal({ x: (last.x - rect.left) / rect.width, y: (last.y - rect.top) / rect.height + FEET_BELOW })
  return { x: encodeX(zone, local.x), y: local.y }
}
