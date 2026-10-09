import { PALETTE_COLORS, type PaletteColor, type Placement } from '../../../model/types'
import type { RoomId } from '../furniture/types'

/**
 * Pure rules of the home. The three rooms share the scene 'casa': a placement's x (0..1) spans the three
 * rooms side by side (sala | habitació | cuina), so each room owns a third of it. y is the fraction of the
 * room's height where the piece stands (its bottom edge).
 */

export interface Room {
  id: RoomId
  name: string
}

export const ROOMS: readonly Room[] = [
  { id: 'sala', name: 'La sala' },
  { id: 'habitacio', name: 'L’habitació' },
  { id: 'cuina', name: 'La cuina' },
]

export const roomIndex = (room: RoomId): number => ROOMS.findIndex((r) => r.id === room)

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Margins inside a room so a piece is never lost off its edges. */
export const LOCAL_X = { min: 0.05, max: 0.95 } as const
export const LOCAL_Y = { min: 0.18, max: 1 } as const

export const clampLocal = (p: { x: number; y: number }): { x: number; y: number } => ({ x: clamp(p.x, LOCAL_X.min, LOCAL_X.max), y: clamp(p.y, LOCAL_Y.min, LOCAL_Y.max) })

/** Room-local x → scene x. */
export const toSceneX = (room: RoomId, local: number): number => clamp((roomIndex(room) + clamp(local, 0, 1)) / ROOMS.length, 0, 1)

/** Room of a scene x (the right edge belongs to the last room). */
export const roomOfX = (x: number): RoomId => ROOMS[Math.min(ROOMS.length - 1, Math.max(0, Math.floor(x * ROOMS.length)))]?.id ?? 'sala'

/** Scene x → room-local x. */
export const toLocalX = (x: number): number => x * ROOMS.length - roomIndex(roomOfX(x))

export const inRoom = (list: readonly Placement[], room: RoomId): Placement[] => list.filter((p) => roomOfX(p.x) === room)

/** A unique id for a new placement (short, schema-safe). */
export const newUid = (now: number, salt: number): string => `m${Math.floor(now).toString(36)}${Math.floor(salt).toString(36)}`.slice(0, 40)

/** Where a piece lands when placed without a finger position (keyboard, catalogue tap): a free-ish spot. */
export function defaultSpot(room: RoomId, count: number, wall: boolean): { x: number; y: number } {
  const local = 0.22 + 0.14 * (count % 5)
  return { x: toSceneX(room, local), y: wall ? 0.34 : 0.9 }
}

export type Direction = 'left' | 'right' | 'up' | 'down'
export const NUDGE = 0.05

/** Moves a piece one step, never out of its room. */
export function nudge(p: Pick<Placement, 'x' | 'y'>, dir: Direction, step = NUDGE): { x: number; y: number } {
  const room = roomOfX(p.x)
  const local = { x: toLocalX(p.x), y: p.y }
  const moved = clampLocal({
    x: local.x + (dir === 'left' ? -step : dir === 'right' ? step : 0),
    y: local.y + (dir === 'up' ? -step : dir === 'down' ? step : 0),
  })
  return { x: toSceneX(room, moved.x), y: moved.y }
}

/** The next colour of the palette (recolourable pieces cycle through it). */
export function nextColor(color: PaletteColor | undefined, fallback: PaletteColor): PaletteColor {
  const i = PALETTE_COLORS.indexOf(color ?? fallback)
  return PALETTE_COLORS[(i + 1) % PALETTE_COLORS.length] ?? fallback
}

/** Paint order: rugs, then wall things, then the rest by depth (lower on screen = in front). */
export function depthOf(p: Pick<Placement, 'y' | 'z'>, kind: { flat?: boolean | undefined; wall?: boolean | undefined }): number {
  if (kind.flat) return 1 + Math.min(p.z, 8)
  if (kind.wall) return 10 + Math.min(p.z, 8)
  return 20 + Math.round(p.y * 400) + Math.min(p.z, 8)
}

/** A z for a new piece: one above every piece already there. */
export const nextZ = (list: readonly Placement[]): number => Math.min(999, list.reduce((m, p) => Math.max(m, p.z + 1), 0))

/** The free pieces a new home starts with (placed once, the first time she opens the house). */
const STARTER: readonly { item: string; room: RoomId; x: number; y: number }[] = [
  { item: 'catifa-rodona', room: 'sala', x: 0.5, y: 0.9 },
  { item: 'coixi', room: 'sala', x: 0.2, y: 0.88 },
  { item: 'planta-test', room: 'sala', x: 0.84, y: 0.8 },
  { item: 'llit', room: 'habitacio', x: 0.6, y: 0.84 },
  { item: 'cadira', room: 'cuina', x: 0.24, y: 0.9 },
]

export function starterLayout(now: number): Placement[] {
  return STARTER.map((s, i) => ({ uid: newUid(now, i), item: s.item, x: toSceneX(s.room, s.x), y: s.y, z: i }))
}
