import type { Placement } from '../../../model/types'
import type { Block } from '../../../sandbox/logic/walkPlan'
import type { SeatDef, SurfaceDef } from '../../../sandbox/types'
import { FURNITURE_BY_ID } from '../furniture/catalog'
import { fixtureWalkables } from './fixturesData'
import { decode, FLOOR_TOP, placementsOnFloor, stageX, type FloorId } from './zones'

/** How big a piece of furniture is drawn: its height in «room units» (600 = a room) times this, over the stage's unit. */
export const FURNITURE_K = 1.5

export interface StageSize {
  readonly w: number
  readonly h: number
}

/** Reference length the sandbox uses for sizes: the stage height, never more than 0.9 of its width. */
export const unitOf = (s: StageSize): number => Math.min(s.h, s.w * 0.9)

/** Furniture follows the floor's height but never more than half its width, so rooms stay roomy on a phone. */
export const furnitureUnit = (s: StageSize): number => Math.min(s.h, s.w * 0.5)

/** Drawn height of a piece, in px. */
export const pieceHeightPx = (itemId: string, s: StageSize): number => ((FURNITURE_BY_ID[itemId]?.h ?? 100) / 600) * furnitureUnit(s) * FURNITURE_K

export interface Walkables {
  readonly blocks: readonly Block[]
  readonly seats: readonly SeatDef[]
  readonly surfaces: readonly SurfaceDef[]
}

const SEATS: Readonly<Record<string, number>> = { sofa: 2, butaca: 1, cadira: 1, puf: 1, llit: 1 }
const TABLES: ReadonlySet<string> = new Set(['taula', 'tauleta', 'escriptori'])

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** What the pieces she placed mean for walking: they block, they can be sat on, a carried thing can be put on tables. */
export function placedWalkables(floor: FloorId, pieces: readonly Placement[], size: StageSize): Walkables {
  const blocks: Block[] = []
  const seats: SeatDef[] = []
  const surfaces: SurfaceDef[] = []
  for (const p of placementsOnFloor(pieces, floor)) {
    const def = FURNITURE_BY_ID[p.item]
    if (!def || def.flat || def.wall) continue
    const s = decode(p)
    const cx = stageX(s.zone, s.x)
    const wFrac = (def.w / 600) * furnitureUnit(size) * FURNITURE_K / size.w
    const hFrac = pieceHeightPx(p.item, size) / size.h
    const feet = clamp(p.y, FLOOR_TOP + 0.05, 0.97)
    if (def.h > 80) {
      blocks.push({ x: cx - wFrac / 2, y: feet - Math.min(0.1, hFrac * 0.5), w: wFrac, h: Math.min(0.1, hFrac * 0.5) })
    }
    const label = `${def.name.charAt(0).toLowerCase()}${def.name.slice(1)}`
    const count = SEATS[def.id] ?? 0
    for (let i = 0; i < count; i++) {
      const dx = count === 1 ? 0 : (i === 0 ? -1 : 1) * wFrac * 0.22
      seats.push({
        id: `${p.uid}-${i}`,
        label: def.id === 'llit' ? 'el llit' : `${/^[aeiou]/.test(label) ? 'l’' : 'el '}${label}${count > 1 ? (i === 0 ? ' (esquerra)' : ' (dreta)') : ''}`,
        at: { x: clamp(cx + dx, 0.12, 0.88), y: clamp(feet + 0.02, FLOOR_TOP + 0.06, 0.97) },
        facing: p.flip ? -1 : i === 0 ? 1 : -1,
      })
    }
    if (TABLES.has(def.id)) {
      surfaces.push({ id: `${p.uid}-taula`, label: `${def.id === 'taula' ? 'la ' : def.id === 'tauleta' ? 'la ' : 'l’'}${label}`, at: { x: cx, y: feet - hFrac * 0.5 }, stand: { x: clamp(cx, 0.12, 0.88), y: clamp(feet + 0.08, FLOOR_TOP + 0.06, 0.95) } })
    }
  }
  return { blocks, seats, surfaces }
}

/** Built into the house (not movable): their blocks, seats and tables. */
export const fixedWalkables = (floor: FloorId, size: StageSize): Walkables => fixtureWalkables(floor, size)

export function walkablesOf(floor: FloorId, pieces: readonly Placement[], size: StageSize): Walkables {
  const fixed = fixedWalkables(floor, size)
  const placed = placedWalkables(floor, pieces, size)
  return { blocks: [...fixed.blocks, ...placed.blocks], seats: [...fixed.seats, ...placed.seats], surfaces: [...fixed.surfaces, ...placed.surfaces] }
}
