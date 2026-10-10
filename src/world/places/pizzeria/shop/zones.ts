import type { ZoneDef } from '../../../sandbox/zoneTypes'
import { groupLayouts, pieceRect, type StageBox } from '../../shared/doing/arrayLayout'
import type { ShareTask } from '../../shared/doing/shareLogic'
import { MAX_SLICES } from '../pizza/cutLogic'
import { OVEN } from '../pizza/pizzaRules'
import { FLOOR_TOP, ROOM } from './rooms'

/** The pizzeria's own places to put things, each on its drawing: the oven, the tip jar and the scooter's bag. */
export function fixedZones(stage: StageBox): readonly ZoneDef[] {
  return [
    { id: OVEN, room: ROOM.kitchen, rect: pieceRect({ x: 0.75, y: 0.47, h: 0.4, ratio: 1.1 }, { fx: 0.27, fy: 0.4, fw: 0.46, fh: 0.46 }, stage), cols: 2, capacity: 2, label: 'el forn', accepts: (d) => d === 'massa-pizza' || d === 'pizza-cuita', quiet: true },
    { id: 'propines', room: ROOM.dining, rect: pieceRect({ x: 0.78, y: 0.5, h: 0.18, ratio: 1.5 }, { fx: 0.5, fy: -0.5, fw: 0.4, fh: 0.6 }, stage), cols: 3, capacity: 9, label: 'el pot de les propines', accepts: (d) => d === 'moneda', quiet: true },
    { id: 'moto', room: ROOM.terrace, rect: pieceRect({ x: 0.64, y: 0.7, h: 0.34, ratio: 1.6 }, { fx: 0.12, fy: 0.12, fw: 0.3, fh: 0.38 }, stage), cols: 3, capacity: 6, label: 'la bossa de la moto', accepts: (d) => d === 'caixa-pizza', quiet: true },
  ]
}

/** What the dining room holds for the request being played. */
export type PizzeriaMode =
  | { readonly kind: 'share'; readonly task: ShareTask }
  | { readonly kind: 'cut'; readonly parts: number; readonly selected: number }

export const PLATE = 'plat-client'
export const plateId = (n: number): string => `plat-${n + 1}`

/** The plates of a sharing, or the one plate of the customer who asks for slices. */
export function requestZones(mode: PizzeriaMode | undefined, stage: StageBox): readonly ZoneDef[] {
  if (!mode) return []
  if (mode.kind === 'cut') {
    return [{ id: PLATE, room: ROOM.dining, rect: { x: 0.3, y: 0.6, w: 0.22, h: 0.16 }, cols: 4, capacity: MAX_SLICES, label: 'el plat de la clienta', accepts: (d) => d === 'tros' }]
  }
  const per = Math.ceil(mode.task.total / mode.task.groups)
  return groupLayouts(mode.task.groups, per, stage, FLOOR_TOP).map((l, n) => ({ id: plateId(n), room: ROOM.dining, rect: l.rect, cols: l.cols, capacity: l.capacity, label: `el plat ${n + 1}`, accepts: (d) => d === 'tros' }))
}
