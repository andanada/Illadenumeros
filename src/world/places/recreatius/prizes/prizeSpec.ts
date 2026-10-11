import type { Item } from '../../../../core/ambit/types'
import { choiceForValue } from '../../../errands/adapters'
import type { Rect } from '../../../sandbox/logic/zones'
import type { ZoneDef } from '../../../sandbox/zoneTypes'
import { zoneSlots } from '../../shared/doing/pileTask'
import type { PileSpec } from '../../shared/doing/usePileTask'
import { ARCADE_ROOM } from '../room/roomId'
import { prizeValue, solutionPrizes, type PrizeTask } from './prizeLogic'

export const TRAY_ZONE = 'safata-clerk'
export const OFF_ZONE = 'premis-sobrants'
const SPARE = 2

/**
 * The tray lies on the floor in front of the cabinets and the shelf's pile is to its right, in their own columns, far enough
 * apart that neither the character (who covers what lies above her) nor a 64 px touch target of one reaches the other.
 * Narrow screens use wider columns (five per row, so a x b is read as a count there).
 */
export const shelfPile = (compact = false): Rect => (compact ? { x: 0.58, y: 0.66, w: 0.4, h: 0.22 } : { x: 0.74, y: 0.68, w: 0.24, h: 0.17 })

/** Slots per row: five (a ten-frame) except for a x b on wide screens, where a row is one group of b. */
export const trayCols = (t: PrizeTask, compact = false): number => (t.mode === 'times' && !compact ? Math.max(2, t.b) : 5)

const trayRect = (cols: number, slots: number, compact: boolean, right: number): Rect => {
  const rows = Math.ceil(slots / cols)
  const cw = compact ? 0.084 : 0.05
  const w = cols * cw
  return { x: Math.max(0.02, right - w), y: 0.88 - rows * 0.05, w, h: rows * 0.05 }
}

/** Prizes she carries from the shelf, and the size of the tray (and of the box for the ones taken out). */
export function prizeLayout(t: PrizeTask, compact = false): { loose: number; slots: number; offSlots: number } {
  const loose = t.mode === 'take' ? 0 : t.mode === 'missing' ? t.b + SPARE : solutionPrizes(t) + SPARE
  return { loose, slots: zoneSlots(t.start + loose, trayCols(t, compact), 0), offSlots: t.mode === 'take' ? zoneSlots(t.start, trayCols(t, compact)) : 0 }
}

export const trayArea = (t: PrizeTask, compact = false): Rect => trayRect(trayCols(t, compact), prizeLayout(t, compact).slots, compact, compact ? (t.mode === 'take' ? 0.98 : 0.46) : 0.64)

/** The box for the toys taken out: left of the tray. */
export const offArea = (t: PrizeTask, compact = false): Rect => trayRect(trayCols(t, compact), prizeLayout(t, compact).offSlots, compact, compact ? 0.44 : 0.34)

export function prizeZones(t: PrizeTask, compact = false): readonly ZoneDef[] {
  const { slots, offSlots } = prizeLayout(t, compact)
  const cols = trayCols(t, compact)
  const accepts = (d: string): boolean => d === t.toy.id
  const tray: ZoneDef = { id: TRAY_ZONE, room: ARCADE_ROOM, rect: trayArea(t, compact), label: 'la safata d’en Kofi', capacity: slots, cols, accepts }
  if (offSlots === 0) return [tray]
  return [tray, { id: OFF_ZONE, room: ARCADE_ROOM, rect: offArea(t, compact), label: 'la caixa dels que sobren', capacity: offSlots, cols, accepts }]
}

const times = (def: string, n: number): readonly string[] => Array.from({ length: Math.max(0, n) }, () => def)

export function prizeSpec(t: PrizeTask, item: Item, active: boolean, giveTo?: string, compact = false): PileSpec {
  const def = t.toy.id
  return {
    zone: TRAY_ZONE,
    room: ARCADE_ROOM,
    pile: shelfPile(compact),
    start: times(def, t.start),
    loose: times(def, prizeLayout(t, compact).loose),
    solution: times(def, solutionPrizes(t)),
    active,
    choose: (inZone) => {
      const n = inZone.filter((d) => d === def).length
      const untouched = n === t.start && solutionPrizes(t) !== t.start
      return untouched || prizeValue(t, n) < 0 ? undefined : choiceForValue(String(prizeValue(t, n)), item)
    },
    ...(giveTo ? { giveTo } : {}),
    gave: (n, to) => `Has donat ${n} ${n === 1 ? t.toy.one : t.toy.many} ${to}.`,
  }
}

export function prizeCaption(t: PrizeTask, touched: boolean): string {
  if (touched) return 'Quan estigui a punt, dóna la safata.'
  if (t.mode === 'take') return 'Treu de la safata els que sobren.'
  return t.mode === 'missing' ? 'Afegeix a la safata els que falten.' : 'Agafa premis del taulell i posa’ls a la safata.'
}
