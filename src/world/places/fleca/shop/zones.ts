import type { ZoneDef } from '../../../sandbox/zoneTypes'
import { arrayLayout, groupLayouts, pieceRect, type StageBox } from '../../shared/doing/arrayLayout'
import type { ShareTask } from '../../shared/doing/shareLogic'
import { OVEN, PRODUCTS, RACK } from '../bake/products'
import { FLOOR_TOP, ROOM } from './rooms'

const FINISHED = new Set(PRODUCTS.map((p) => p.id as string))
const RAW = new Set(PRODUCTS.map((p) => p.raw))
const HOT = new Set(PRODUCTS.map((p) => p.hot))

/** The bakery's own places to put things, each sitting exactly on its drawing: oven, cooling rack, counter display and cash till. */
export function fixedZones(stage: StageBox): readonly ZoneDef[] {
  return [
    { id: OVEN, room: ROOM.oven, rect: pieceRect({ x: 0.75, y: 0.47, h: 0.4, ratio: 1.1 }, { fx: 0.17, fy: 0.36, fw: 0.67, fh: 0.5 }, stage), cols: 3, capacity: 6, label: 'el forn', accepts: (d) => RAW.has(d) || HOT.has(d), quiet: true },
    { id: RACK, room: ROOM.oven, rect: pieceRect({ x: 0.2, y: 0.47, h: 0.36, ratio: 0.9 }, { fx: 0.1, fy: 0.1, fw: 0.8, fh: 0.72 }, stage), cols: 3, capacity: 9, label: 'la reixa de refredar', accepts: (d) => HOT.has(d) || FINISHED.has(d), quiet: true },
    { id: 'expositor', room: ROOM.shop, rect: pieceRect({ x: 0.62, y: 0.57, h: 0.2, ratio: 3 }, { fx: 0.08, fy: -0.5, fw: 0.5, fh: 0.6 }, stage), cols: 5, capacity: 5, label: 'l’expositor', accepts: (d) => FINISHED.has(d), quiet: true },
    { id: 'caixa', room: ROOM.shop, rect: pieceRect({ x: 0.62, y: 0.57, h: 0.2, ratio: 3 }, { fx: 0.66, fy: -0.5, fw: 0.28, fh: 0.6 }, stage), cols: 4, capacity: 8, label: 'la caixa registradora', accepts: (d) => FINISHED.has(d), quiet: true },
  ]
}

/** What the shop floor holds for the request being played. */
export type FlecaMode =
  | { readonly kind: 'array'; readonly rows: number; readonly cols: number; readonly extraRows: number; readonly product: string }
  | { readonly kind: 'share'; readonly task: ShareTask; readonly product: string }

export const TRAY = 'safata'
export const trayId = (n: number): string => `safata-${n + 1}`

/** The request frames: one tray laid out as rows × columns, or one tray per group to share onto. */
export function requestZones(mode: FlecaMode | undefined, stage: StageBox): readonly ZoneDef[] {
  if (!mode) return []
  const accepts = (d: string): boolean => d === mode.product
  if (mode.kind === 'array') {
    const l = arrayLayout({ rows: mode.rows, cols: mode.cols, extraRows: mode.extraRows }, stage, FLOOR_TOP)
    return [{ id: TRAY, room: ROOM.shop, rect: l.rect, cols: l.cols, capacity: l.capacity, label: 'la safata', accepts }]
  }
  const per = Math.ceil(mode.task.total / mode.task.groups)
  return groupLayouts(mode.task.groups, per, stage, FLOOR_TOP).map((l, n) => ({ id: trayId(n), room: ROOM.shop, rect: l.rect, cols: l.cols, capacity: l.capacity, label: `la safata ${n + 1}`, accepts }))
}
