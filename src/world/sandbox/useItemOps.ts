import type { Dispatch } from 'react'
import type { CastApi } from './CastContext'
import type { DefMap } from './defs'
import { fx } from './fx'
import type { Pt } from './logic/actorMachine'
import { placedSaid } from './logic/catalan'
import { itemsHeldBy, makeItem, type ItemState, type Items, type ItemsAction } from './logic/itemsState'
import { countItems, freeSlot, queryItems, qtyOf, zoneCounts, zoneItems, zoneStand, type CountQuery } from './logic/zones'
import { placeSchema, spawnSchema, type PlaceOptions, type SpawnOptions, type ZoneDef } from './zoneTypes'

export interface OpsDeps {
  cast: CastApi
  defs: DefMap
  zones: Readonly<Record<string, ZoneDef>>
  /** The freshest items: updated synchronously by every dispatch, so spawn → place in one tick works. */
  fresh: () => Items
  send: Dispatch<ItemsAction>
}

const cap = (t: string): string => (t.length === 0 ? t : `${t[0]?.toUpperCase() ?? ''}${t.slice(1)}`)

/** The programmatic side of the world: make, move, use up and count objects. Every call validates its input. */
export function makeOps(get: () => OpsDeps) {
  let serial = 0
  const say = (text: string): void => get().cast.announce(text)
  const singleOf = (defId: string): string => {
    const def = get().defs[defId]
    return def?.single ?? def?.label ?? 'una cosa'
  }
  const accepts = (zone: ZoneDef, defId: string): boolean => zone.accepts?.(defId) ?? true
  const countIn = (zone: ZoneDef, defId: string): number => zoneCounts(get().fresh(), zone.id)[defId] ?? 0

  const freeUid = (defId: string): string => {
    let uid = `${defId}~${++serial}`
    while (get().fresh()[uid]) uid = `${defId}~${++serial}`
    return uid
  }

  /** Lets go of an object that someone holds (the hand empties). */
  const release = (item: ItemState): void => {
    if (item.loc.t === 'held') get().cast.setCarrying(item.loc.by, undefined)
  }

  function spawn(defId: string, options: SpawnOptions): string | undefined {
    const d = get()
    const def = d.defs[defId]
    const opts = spawnSchema.parse(options)
    if (!def) return undefined
    if (opts.uid && d.fresh()[opts.uid]) return undefined
    const zone = opts.zone ? d.zones[opts.zone] : undefined
    if (opts.zone && (!zone || !accepts(zone, defId))) return undefined
    const slot = zone ? freeSlot(d.fresh(), zone) : undefined
    if (zone && !slot) return undefined
    const uid = opts.uid ?? freeUid(defId)
    const at: Pt = slot ?? opts.at
    const room = zone?.room ?? opts.room
    const qty = def.stackable && opts.qty && opts.qty > 1 ? opts.qty : undefined
    d.send({ type: 'add', item: makeItem(uid, defId, { t: 'floor', room, at }, { ...(zone ? { zone: zone.id } : {}), ...(qty ? { qty } : {}) }) })
    return uid
  }

  function place(uid: string, target: PlaceOptions): boolean {
    const d = get()
    const where = placeSchema.parse(target)
    const item = d.fresh()[uid]
    if (!item || item.loc.t === 'gone') return false
    release(item)
    d.send({ type: 'place', uid, room: where.room, at: where.at })
    return true
  }

  function remove(uid: string): boolean {
    const d = get()
    const item = d.fresh()[uid]
    if (!item) return false
    release(item)
    d.send({ type: 'delete', uid })
    return true
  }

  /** Uses a thing up: it pops (small poof and sound), and it no longer counts anywhere. */
  function consume(uid: string): boolean {
    const d = get()
    const item = d.fresh()[uid]
    if (!item || item.loc.t === 'gone') return false
    release(item)
    if (item.loc.t === 'floor') d.cast.poof(item.loc.at)
    d.send({ type: 'gone', uid })
    fx.squish()
    return true
  }

  const count = (q: CountQuery): number => countItems(get().fresh(), q)
  const query = (room: string, defId?: string): ItemState[] => queryItems(get().fresh(), { room, ...(defId ? { def: defId } : {}) })

  /** Puts an object in a zone's next free slot (or into the stack that already lies there). False when it does not fit. */
  function putInZone(uid: string, zoneId: string): boolean {
    const d = get()
    const zone = d.zones[zoneId]
    const item = d.fresh()[uid]
    if (!zone || !item || item.loc.t === 'gone' || !accepts(zone, item.def)) return false
    const stack = d.defs[item.def]?.stackable ? zoneItems(d.fresh(), zoneId).find((z) => z.def === item.def && z.uid !== uid) : undefined
    if (stack) {
      d.send({ type: 'qty', uid: stack.uid, qty: qtyOf(stack) + qtyOf(item) })
      release(item)
      d.send({ type: 'delete', uid })
    } else {
      const slot = freeSlot(d.fresh(), zone)
      if (!slot) return false
      release(item)
      d.send({ type: 'place', uid, room: zone.room, at: slot, zone: zoneId })
    }
    const total = countIn(zone, item.def)
    if (zone.announceCount !== false) say(placedSaid(singleOf(item.def), zone.label, total))
    zone.onDrop?.({ zone: zoneId, uid, def: item.def, count: total })
    return true
  }

  /** Tap a zone while carrying: she walks over and puts the thing in. The tap alternative to everything else. */
  function tapZone(zoneId: string): void {
    fx.unlock()
    const d = get()
    const zone = d.zones[zoneId]
    const who = d.cast.state.selected
    if (!zone || itemsHeldBy(d.fresh(), who).length === 0) return
    d.cast.walkTo(who, zoneStand(zone), () => {
      const now = get()
      const held = itemsHeldBy(now.fresh(), who)[0]
      if (!held) return
      if (!accepts(zone, held.def)) {
        fx.no()
        say(`${cap(zone.label)} no vol ${singleOf(held.def)}.`)
      } else if (putInZone(held.uid, zoneId)) fx.put()
      else {
        fx.no()
        say(`${cap(zone.label)} és plena.`)
      }
    })
  }

  /** A pick that takes only one from a stack: the rest stays. Returns the uid that is now in hand. */
  function takeOne(uid: string): string {
    const d = get()
    const item = d.fresh()[uid]
    if (!item || qtyOf(item) <= 1 || item.loc.t !== 'floor') return uid
    d.send({ type: 'qty', uid, qty: qtyOf(item) - 1 })
    const one = freeUid(item.def)
    d.send({ type: 'add', item: makeItem(one, item.def, { t: 'floor', room: item.loc.room, at: item.loc.at }) })
    return one
  }

  return { spawn, place, remove, consume, count, query, putInZone, tapZone, takeOne }
}

export type ItemOps = ReturnType<typeof makeOps>
