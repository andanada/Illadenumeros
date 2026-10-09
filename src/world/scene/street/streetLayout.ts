import type { SceneId } from '../../model/types'

/** A box on the street, in street units (1 unit ≈ 1 px at scale 1). `x` is the left edge. */
export interface StreetBox {
  readonly x: number
  readonly w: number
  readonly h: number
}

export interface LaidSpot extends StreetBox {
  readonly id: SceneId
}

export interface LaidScenery extends StreetBox {
  readonly id: string
}

export interface StreetLayout {
  readonly spots: readonly LaidSpot[]
  readonly scenery: readonly LaidScenery[]
  /** Total street length. */
  readonly length: number
}

/** Size of each lot's façade. */
const LOT_SIZE: Readonly<Record<SceneId, { w: number; h: number }>> = {
  casa: { w: 260, h: 330 },
  botiga: { w: 320, h: 330 },
  autobus: { w: 260, h: 270 },
  perruqueria: { w: 280, h: 320 },
  recreatius: { w: 300, h: 330 },
  fleca: { w: 280, h: 320 },
  granja: { w: 300, h: 300 },
  pizzeria: { w: 280, h: 320 },
  mercat: { w: 340, h: 310 },
}

/** Street furniture between two lots, in turn. */
const BETWEEN = [
  [{ id: 'fanal', w: 64, h: 230 }],
  [{ id: 'arbre', w: 170, h: 240 }],
  [
    { id: 'banc', w: 120, h: 70 },
    { id: 'mata', w: 60, h: 50 },
  ],
  [{ id: 'pi', w: 110, h: 230 }],
] as const

const START = 150
const GAP = 190
const END_PAD = 200

/** Pure: lays the lots left to right with something growing or standing between each pair. */
export function layoutStreet(ids: readonly SceneId[]): StreetLayout {
  const spots: LaidSpot[] = []
  const scenery: LaidScenery[] = [{ id: 'pi', x: 20, w: 110, h: 230 }]
  let x = START
  ids.forEach((id, i) => {
    const size = LOT_SIZE[id]
    spots.push({ id, x, ...size })
    x += size.w
    const group = BETWEEN[i % BETWEEN.length] ?? BETWEEN[0]
    const width = group.reduce((n, s) => n + s.w, 0)
    let at = x + (GAP - width) / 2
    for (const item of group) {
      scenery.push({ id: item.id, x: at, w: item.w, h: item.h })
      at += item.w
    }
    x += GAP
  })
  return { spots, scenery, length: x - GAP + END_PAD }
}

/** Centre of a lot, in street units. */
export const centreOf = (box: StreetBox): number => box.x + box.w / 2
