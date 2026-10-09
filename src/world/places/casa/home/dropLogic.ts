import type { RoomId } from '../furniture/types'
import { clampLocal, defaultSpot, toLocalX, toSceneX } from './homeLogic'
import { freshPointIn, type PointerTrack } from './useLastPointer'

interface Box {
  left: number
  top: number
  width: number
  height: number
}

export interface DropInput {
  room: RoomId
  rect: Box
  track: PointerTrack
  now: number
  /** Moving a piece already in the room: its current position. Undefined = a new piece from the catalogue. */
  moving?: { x: number; y: number } | undefined
  /** Pieces already in the room (spreads keyboard placements). */
  count: number
  wall: boolean
}

/** A drag moved the finger at least this far (otherwise it was a tap). */
const DRAG_PX = 8
/** A tapped spot is where the piece's feet go, a little under the finger so it stands where she pointed. */
const FEET_BELOW = 0.06

/**
 * Where a dropped piece goes, in placement coordinates:
 * - dragged piece of the room → moved by exactly the finger's travel (it does not jump under the finger);
 * - tap-to-place or a new piece → stands where she tapped / let go;
 * - keyboard (no fresh finger position) → stays put, or a free-ish spot for a new piece.
 */
export function dropTarget({ room, rect, track, now, moving, count, wall }: DropInput): { x: number; y: number } {
  const last = freshPointIn(track.last, rect, now)
  if (!last) return moving ?? defaultSpot(room, count, wall)
  const down = track.down
  const dragged = down !== undefined && Math.hypot(last.x - down.x, last.y - down.y) >= DRAG_PX
  if (moving && dragged) {
    const local = clampLocal({ x: toLocalX(moving.x) + (last.x - down.x) / rect.width, y: moving.y + (last.y - down.y) / rect.height })
    return { x: toSceneX(room, local.x), y: local.y }
  }
  const local = clampLocal({ x: (last.x - rect.left) / rect.width, y: (last.y - rect.top) / rect.height + FEET_BELOW })
  return { x: toSceneX(room, local.x), y: local.y }
}
