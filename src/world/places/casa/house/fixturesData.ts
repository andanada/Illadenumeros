import type { Block } from '../../../sandbox/logic/walkPlan'
import type { SeatDef, SurfaceDef } from '../../../sandbox/types'
import type { FloorId } from './zones'

/** Things built into the house. Their size follows the floor's height, but never more than half its width (narrow phones). */
export interface FixtureSpec {
  readonly id: string
  readonly floor: FloorId
  /** Centre x and feet y, fractions of the floor stage. */
  readonly x: number
  readonly y: number
  /** Height as a fraction of the fixture unit. */
  readonly h: number
  /** Width / height of the drawing. */
  readonly aspect: number
  /** Blocks walking over this depth of its base (fraction of the stage height). Undefined = walk freely in front. */
  readonly block?: number
  /** Seats along its width: dx = offset from the centre as a fraction of its width. */
  readonly seats?: readonly { dx: number; facing: 1 | -1 }[]
  /** Name with article: «el sofà». */
  readonly label: string
  /** A carried thing can be put on top. */
  readonly surface?: boolean
}

export const FIXTURES: readonly FixtureSpec[] = [
  { id: 'sofa', floor: 'baixa', x: 0.28, y: 0.665, h: 0.38, aspect: 2.1, block: 0.12, seats: [{ dx: -0.27, facing: 1 }, { dx: 0.27, facing: -1 }], label: 'el sofà' },
  { id: 'encimera', floor: 'baixa', x: 0.77, y: 0.62, h: 0.3, aspect: 2.2, block: 0.1, label: 'l’encimera', surface: true },
  { id: 'mirall', floor: 'pis', x: 0.545, y: 0.38, h: 0.3, aspect: 0.82, label: 'el mirall' },
  { id: 'lavabo', floor: 'pis', x: 0.545, y: 0.665, h: 0.26, aspect: 0.9, block: 0.1, label: 'el lavabo', surface: true },
  { id: 'prestatge', floor: 'golfes', x: 0.24, y: 0.62, h: 0.52, aspect: 1.07, label: 'la prestatgeria' },
  { id: 'jardinera', floor: 'golfes', x: 0.8, y: 0.62, h: 0.18, aspect: 2.4, block: 0.07, label: 'la jardinera' },
]

/** Reference length for fixtures: the stage height, never more than half its width. */
export const fixtureUnit = (s: { w: number; h: number }): number => Math.min(s.h, s.w * 0.52)

export const fixturesOn = (floor: FloorId): readonly FixtureSpec[] => FIXTURES.filter((f) => f.floor === floor)

const widthFrac = (f: FixtureSpec, s: { w: number; h: number }): number => (f.h * fixtureUnit(s) * f.aspect) / s.w

/** What the built-in things mean for walking (the fridge is an object, but it too is in the way). */
export function fixtureWalkables(floor: FloorId, s: { w: number; h: number }): { blocks: Block[]; seats: SeatDef[]; surfaces: SurfaceDef[] } {
  const blocks: Block[] = []
  const seats: SeatDef[] = []
  const surfaces: SurfaceDef[] = []
  for (const f of fixturesOn(floor)) {
    const w = widthFrac(f, s)
    if (f.block !== undefined) blocks.push({ x: f.x - w / 2, y: f.y - f.block, w, h: f.block })
    f.seats?.forEach((seat, i) => seats.push({ id: `${f.id}-${i}`, label: `${f.label} (${i === 0 ? 'esquerra' : 'dreta'})`, at: { x: f.x + seat.dx * w, y: f.y + 0.005 }, facing: seat.facing }))
    if (f.surface) surfaces.push({ id: f.id, label: f.label, at: { x: f.x, y: f.y - 0.06 }, stand: { x: f.x, y: Math.min(0.9, f.y + 0.1) } })
  }
  if (floor === 'baixa') {
    const fw = (0.62 * Math.min(s.h, s.w * 0.9) * 0.6) / s.w
    blocks.push({ x: 0.58 - fw / 2, y: 0.56, w: fw, h: 0.1 })
  }
  return { blocks, seats, surfaces }
}
