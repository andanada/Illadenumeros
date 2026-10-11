import type { Item } from '../../../../core/ambit/types'
import { breakdown } from '../../../../ui/visual/moneyLogic'
import type { Rect } from '../../../sandbox/logic/zones'
import type { ZoneDef } from '../../../sandbox/zoneTypes'
import type { PileSpec } from '../../shared/doing/usePileTask'
import { payChoice, type PayTask } from '../errands/payLogic'
import { centsOfPiece, isPiece, pieceId } from '../shop/coins'
import { ROOM } from '../shop/rooms'

export const HAND_ZONE = 'ma-client'

/**
 * The till drawer lies open at the left and the customer's hand is to the right, in their own columns, far enough apart that
 * neither the character (who covers what lies above her) nor a 64 px touch target of one reaches the other. Narrow screens
 * use wider columns.
 */
export const drawerRect = (compact = false): Rect => (compact ? { x: 0.02, y: 0.66, w: 0.36, h: 0.29 } : { x: 0.2, y: 0.74, w: 0.31, h: 0.2 })
export const handRect = (compact = false): Rect => (compact ? { x: 0.56, y: 0.74, w: 0.42, h: 0.21 } : { x: 0.56, y: 0.8, w: 0.36, h: 0.15 })

/** The customer's open hand: rows of coins and notes (room for every piece of the drawer). */
export function changeZone(task: PayTask, compact = false): ZoneDef {
  const capacity = Math.max(6, task.drawer.length)
  return { id: HAND_ZONE, room: ROOM.floor, rect: handRect(compact), label: 'la mà del client', capacity, cols: compact ? 5 : 6, accepts: isPiece }
}

/** Cents that lie in the hand. Pure over the defs of the zone. */
export const handTotal = (inZone: readonly string[]): number => inZone.reduce((sum, d) => sum + (centsOfPiece(d) ?? 0), 0)

/** What the till lays out for a change request: all the pieces of the drawer, the exact change as the solution. */
export function changeSpec(task: PayTask, item: Item, active: boolean, giveTo?: string, compact = false): PileSpec {
  return {
    zone: HAND_ZONE,
    room: ROOM.floor,
    pile: drawerRect(compact),
    start: [],
    loose: task.drawer.map(pieceId),
    solution: breakdown(task.target).map(pieceId),
    active,
    choose: (inZone) => (inZone.length === 0 ? undefined : payChoice(handTotal(inZone), item)),
    ...(giveTo ? { giveTo } : {}),
    gave: (_n, to) => `Has donat el canvi ${to}.`,
  }
}

/** Words under the card while she works. */
export const changeCaption = (touched: boolean): string => (touched ? 'Quan el canvi estigui a la mà, dóna’l.' : 'Agafa monedes del calaix i posa-les a la mà del client.')
