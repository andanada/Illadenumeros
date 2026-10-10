import { PALETTE_COLORS, type PaletteColor, type Placement } from '../../../model/types'

/**
 * The dollhouse: three floors, two zones each. A placement of the scene 'casa' keeps x in 0..1 over SIX zones
 * (sixths); y is the fraction of the floor's height where the piece stands. Pieces saved by the old three-room
 * home (uid not starting with «h») used thirds (sala | habitació | cuina): they are read as such until migrated.
 */
export type ZoneId = 'sala' | 'cuina' | 'habitacio' | 'bany' | 'estudi' | 'terrassa'
export type FloorId = 'baixa' | 'pis' | 'golfes'

export interface Zone {
  readonly id: ZoneId
  readonly name: string
  readonly floor: FloorId
  /** 0 = left half of the floor, 1 = right half. */
  readonly side: 0 | 1
}

export const ZONES: readonly Zone[] = [
  { id: 'sala', name: 'La sala', floor: 'baixa', side: 0 },
  { id: 'cuina', name: 'La cuina', floor: 'baixa', side: 1 },
  { id: 'habitacio', name: 'L’habitació', floor: 'pis', side: 0 },
  { id: 'bany', name: 'El bany', floor: 'pis', side: 1 },
  { id: 'estudi', name: 'L’estudi', floor: 'golfes', side: 0 },
  { id: 'terrassa', name: 'La terrassa', floor: 'golfes', side: 1 },
]

export const ZONE_BY_ID: Readonly<Record<ZoneId, Zone>> = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<ZoneId, Zone>

export interface Floor {
  readonly id: FloorId
  readonly name: string
  readonly zones: readonly [ZoneId, ZoneId]
}

/** Top to bottom, as the cutaway is drawn. */
export const FLOORS: readonly Floor[] = [
  { id: 'golfes', name: 'Golfes', zones: ['estudi', 'terrassa'] },
  { id: 'pis', name: 'Primer pis', zones: ['habitacio', 'bany'] },
  { id: 'baixa', name: 'Planta baixa', zones: ['sala', 'cuina'] },
]

export const FLOOR_BY_ID: Readonly<Record<FloorId, Floor>> = Object.fromEntries(FLOORS.map((f) => [f.id, f])) as Record<FloorId, Floor>

/** Where the floor starts inside a floor's stage (fraction of its height). */
export const FLOOR_TOP = 0.5

/** The stair columns take this much width at each end of a floor; the two zones share the rest. */
export const COLUMN = 0.1
const ZONE_SPAN = (1 - 2 * COLUMN) / 2

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Margins inside a zone so a piece is never lost off its edges. */
export const LOCAL_X = { min: 0.06, max: 0.94 } as const
export const LOCAL_Y = { min: 0.2, max: 0.97 } as const
export const clampLocal = (p: { x: number; y: number }): { x: number; y: number } => ({ x: clamp(p.x, LOCAL_X.min, LOCAL_X.max), y: clamp(p.y, LOCAL_Y.min, LOCAL_Y.max) })

const LEGACY: readonly ZoneId[] = ['sala', 'habitacio', 'cuina']

/** New-scheme pieces carry this uid prefix. */
export const HOUSE_PREFIX = 'h'
export const isHouseUid = (uid: string): boolean => uid.startsWith(HOUSE_PREFIX)
export const newHouseUid = (now: number, salt: number): string => `${HOUSE_PREFIX}${Math.floor(now).toString(36)}${Math.floor(salt).toString(36)}`.slice(0, 40)

export interface Spot {
  readonly zone: ZoneId
  /** 0..1 inside the zone. */
  readonly x: number
  readonly y: number
}

/** The zone and local position a saved placement means. */
export function decode(p: Pick<Placement, 'uid' | 'x' | 'y'>): Spot {
  const n = isHouseUid(p.uid) ? ZONES.length : LEGACY.length
  const slot = Math.min(n - 1, Math.max(0, Math.floor(p.x * n)))
  const zone = isHouseUid(p.uid) ? (ZONES[slot]?.id ?? 'sala') : (LEGACY[slot] ?? 'sala')
  return { zone, x: clamp(p.x * n - slot, 0, 1), y: p.y }
}

/** Saved x for a spot (new scheme). */
export const encodeX = (zone: ZoneId, local: number): number => clamp((ZONES.findIndex((z) => z.id === zone) + clamp(local, 0, 1)) / ZONES.length, 0, 1)

/** Stage x (fraction of the floor's width) of a local x in a zone. */
export function stageX(zone: ZoneId, local: number): number {
  const side = ZONE_BY_ID[zone].side
  return COLUMN + side * ZONE_SPAN + clamp(local, 0, 1) * ZONE_SPAN
}

/** Local x of a stage x (clamped to the zone nearest to it). */
export function localX(zone: ZoneId, x: number): number {
  const side = ZONE_BY_ID[zone].side
  return clamp((x - COLUMN - side * ZONE_SPAN) / ZONE_SPAN, 0, 1)
}

/** The zone of a floor under a stage x. */
export function zoneAt(floor: FloorId, x: number): ZoneId {
  const [left, right] = FLOOR_BY_ID[floor].zones
  return x < 0.5 ? left : right
}

export const placementsIn = (list: readonly Placement[], zone: ZoneId): Placement[] => list.filter((p) => decode(p).zone === zone)
export const placementsOnFloor = (list: readonly Placement[], floor: FloorId): Placement[] => list.filter((p) => ZONE_BY_ID[decode(p).zone].floor === floor)

/** Where a piece lands when placed without a finger position. */
export function defaultSpot(zone: ZoneId, count: number, wall: boolean): { x: number; y: number } {
  return { x: encodeX(zone, 0.2 + 0.15 * (count % 5)), y: wall ? 0.34 : 0.9 }
}

export type Direction = 'left' | 'right' | 'up' | 'down'
export const NUDGE = 0.06

/** Moves a piece one step, never out of its zone. */
export function nudge(p: Pick<Placement, 'uid' | 'x' | 'y'>, dir: Direction, step = NUDGE): { x: number; y: number } {
  const s = decode(p)
  const moved = clampLocal({ x: s.x + (dir === 'left' ? -step * 2 : dir === 'right' ? step * 2 : 0), y: s.y + (dir === 'up' ? -step : dir === 'down' ? step : 0) })
  return { x: encodeX(s.zone, moved.x), y: moved.y }
}

/** The free pieces a new home starts with (placed once, the first time she opens the house). */
const STARTER: readonly { item: string; zone: ZoneId; x: number; y: number }[] = [
  { item: 'catifa-rodona', zone: 'sala', x: 0.5, y: 0.9 },
  { item: 'coixi', zone: 'estudi', x: 0.5, y: 0.9 },
  { item: 'planta-test', zone: 'sala', x: 0.88, y: 0.8 },
  { item: 'llit', zone: 'habitacio', x: 0.5, y: 0.8 },
  { item: 'cadira', zone: 'cuina', x: 0.85, y: 0.9 },
]

export function starterLayout(now: number): Placement[] {
  return STARTER.map((s, i) => ({ uid: newHouseUid(now, i), item: s.item, x: encodeX(s.zone, s.x), y: s.y, z: i }))
}

/** Legacy pieces rewritten in the new scheme (same room, new uid), so they can go to any zone afterwards. */
export function migrate(p: Placement, salt: number, now: number): Placement {
  const s = decode(p)
  return { ...p, uid: newHouseUid(now, salt), x: encodeX(s.zone, s.x) }
}

/** The next colour of the palette (recolourable pieces cycle through it). */
export function nextColour(color: PaletteColor | undefined, fallback: PaletteColor): PaletteColor {
  const i = PALETTE_COLORS.indexOf(color ?? fallback)
  return PALETTE_COLORS[(i + 1) % PALETTE_COLORS.length] ?? fallback
}
