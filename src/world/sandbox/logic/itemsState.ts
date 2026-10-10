import type { Pt } from './actorMachine'
import { CHAIN_START, type ChainState } from './useChain'
import { SURPRISE_START, type SurpriseState } from './surprise'

/** Where an object is. Containers keep their contents by pointing at them (`in`). */
export type Loc =
  | { readonly t: 'floor'; readonly room: string; readonly at: Pt }
  | { readonly t: 'held'; readonly by: string }
  | { readonly t: 'in'; readonly box: string }
  | { readonly t: 'gone' }

export interface ItemState {
  readonly uid: string
  /** Id of the declarative definition (InteractableDef). */
  readonly def: string
  readonly loc: Loc
  readonly chain: ChainState
  readonly surprise: SurpriseState
  readonly open: boolean
  /** Bumped by every touch so the art can replay its squish. */
  readonly pokes: number
  /** Counting zone this object lies in (it is also a `floor` object, at the zone's slot). */
  readonly zone?: string
  /** How many are in this stack (stackable defs only; 1 when absent). */
  readonly qty?: number
}

export type Items = Readonly<Record<string, ItemState>>

export const makeItem = (uid: string, def: string, loc: Loc, extra: { zone?: string; qty?: number } = {}): ItemState => ({
  uid,
  def,
  loc,
  chain: CHAIN_START,
  surprise: SURPRISE_START,
  open: false,
  pokes: 0,
  ...(extra.zone ? { zone: extra.zone } : {}),
  ...(extra.qty !== undefined ? { qty: extra.qty } : {}),
})

export type ItemsAction =
  | { type: 'add'; item: ItemState }
  | { type: 'pick'; uid: string; by: string }
  | { type: 'drop'; uid: string; room: string; at: Pt }
  | { type: 'toggle'; uid: string }
  | { type: 'chain'; uid: string; state: ChainState }
  | { type: 'surprise'; uid: string; state: SurpriseState }
  | { type: 'poke'; uid: string }
  | { type: 'gone'; uid: string }
  | { type: 'hand'; uid: string; to: string }
  | { type: 'stash'; uid: string; box: string }
  | { type: 'place'; uid: string; room: string; at: Pt; zone?: string }
  | { type: 'delete'; uid: string }
  | { type: 'qty'; uid: string; qty: number }

const leaveZone = (i: ItemState): ItemState => {
  const { zone: _zone, ...rest } = i
  return rest
}

const patch = (items: Items, uid: string, change: (i: ItemState) => ItemState): Items => {
  const cur = items[uid]
  return cur ? { ...items, [uid]: change(cur) } : items
}

export function itemsReducer(items: Items, a: ItemsAction): Items {
  switch (a.type) {
    case 'add':
      return items[a.item.uid] ? items : { ...items, [a.item.uid]: a.item }
    case 'pick':
      return patch(items, a.uid, (i) => (i.loc.t === 'gone' ? i : { ...leaveZone(i), loc: { t: 'held', by: a.by } }))
    case 'hand':
      return patch(items, a.uid, (i) => ({ ...i, loc: { t: 'held', by: a.to } }))
    case 'stash':
      return patch(items, a.uid, (i) => ({ ...i, loc: { t: 'in', box: a.box } }))
    case 'drop':
      return patch(items, a.uid, (i) => ({ ...leaveZone(i), loc: { t: 'floor', room: a.room, at: a.at } }))
    case 'place':
      return patch(items, a.uid, (i) => ({ ...leaveZone(i), ...(a.zone ? { zone: a.zone } : {}), loc: { t: 'floor', room: a.room, at: a.at } }))
    case 'delete': {
      if (!(a.uid in items)) return items
      const { [a.uid]: _removed, ...rest } = items
      return rest
    }
    case 'qty':
      return patch(items, a.uid, (i) => ({ ...i, qty: Math.max(1, Math.floor(a.qty)) }))
    case 'toggle':
      return patch(items, a.uid, (i) => ({ ...i, open: !i.open, pokes: i.pokes + 1 }))
    case 'chain':
      return patch(items, a.uid, (i) => ({ ...i, chain: a.state, pokes: i.pokes + 1 }))
    case 'surprise':
      return patch(items, a.uid, (i) => ({ ...i, surprise: a.state, pokes: i.pokes + 1 }))
    case 'poke':
      return patch(items, a.uid, (i) => ({ ...i, pokes: i.pokes + 1 }))
    case 'gone':
      return patch(items, a.uid, (i) => ({ ...leaveZone(i), loc: { t: 'gone' } }))
  }
}

export const itemsHeldBy = (items: Items, who: string): ItemState[] => Object.values(items).filter((i) => i.loc.t === 'held' && i.loc.by === who)
export const itemsIn = (items: Items, box: string): ItemState[] => Object.values(items).filter((i) => i.loc.t === 'in' && i.loc.box === box)
export const itemsInRoom = (items: Items, room: string): ItemState[] => Object.values(items).filter((i) => i.loc.t === 'floor' && i.loc.room === room)

/** A box hands out its contents only while open. */
export const canTakeFrom = (items: Items, uid: string): boolean => {
  const item = items[uid]
  if (!item) return false
  if (item.loc.t === 'floor') return true
  if (item.loc.t === 'in') return items[item.loc.box]?.open === true
  return false
}
