import type { DoorDef } from '../../../sandbox/types'
import { FLOOR_TOP, type FloorId } from './zones'

/**
 * The staircases zig-zag: ground ↔ first floor in the left column, first floor ↔ attic in the right one.
 * An actor walks to the BACK of the column (the top step), crosses, and comes out at the back of the column
 * above or below, then walks to the landing. Each stair is a sandbox door; the front door is the one to the street.
 */
export const STREET = 'carrer'
const BACK = FLOOR_TOP + 0.07
const FRONT = 0.9

export interface Stair extends DoorDef {
  readonly floor: FloorId
  /** Where the actor walks to after coming out (the landing in front of the column). */
  readonly landing: { x: number; y: number }
  readonly dir: 'up' | 'down' | 'street'
}

const stair = (floor: FloorId, dir: 'up' | 'down', col: 0.05 | 0.95, to: FloorId, label: string): Stair => ({
  id: `escala-${floor}-${dir}`,
  floor,
  dir,
  label,
  at: { x: col, y: BACK },
  to,
  arrive: { x: col, y: BACK },
  landing: { x: col === 0.05 ? 0.12 : 0.88, y: FRONT },
  box: { w: 0.1, h: 0.44 },
})

export const STAIRS: readonly Stair[] = [
  stair('baixa', 'up', 0.05, 'pis', 'Escala cap amunt, al primer pis'),
  stair('pis', 'down', 0.05, 'baixa', 'Escala cap avall, a la planta baixa'),
  stair('pis', 'up', 0.95, 'golfes', 'Escala cap amunt, a les golfes'),
  stair('golfes', 'down', 0.95, 'pis', 'Escala cap avall, al primer pis'),
]

export const FRONT_DOOR: Stair = {
  id: 'porta-carrer',
  floor: 'baixa',
  dir: 'street',
  label: 'Porta de casa: surt al carrer',
  at: { x: 0.95, y: BACK },
  to: STREET,
  arrive: { x: 0.95, y: BACK },
  landing: { x: 0.88, y: FRONT },
  box: { w: 0.06, h: 0.5 },
}

export const stairsOn = (floor: FloorId): readonly Stair[] => STAIRS.filter((s) => s.floor === floor)

export const stairById = (id: string): Stair | undefined => [...STAIRS, FRONT_DOOR].find((s) => s.id === id)

/** The stairs to climb to go from one floor to another (empty when already there). */
export function route(from: FloorId, to: FloorId): readonly Stair[] {
  const order: readonly FloorId[] = ['baixa', 'pis', 'golfes']
  const a = order.indexOf(from)
  const b = order.indexOf(to)
  if (a === b) return []
  const step = b > a ? 1 : -1
  const out: Stair[] = []
  for (let i = a; i !== b; i += step) {
    const here = order[i]
    const next = order[i + step]
    const s = STAIRS.find((x) => x.floor === here && x.to === next)
    if (!s) return []
    out.push(s)
  }
  return out
}
