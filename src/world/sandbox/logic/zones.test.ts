import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { itemsReducer, makeItem, type Items } from './itemsState'
import { countItems, countsKey, freeSlot, inRect, queryItems, slotPoints, zoneCounts, zoneItems, zoneStand, zoneTotal, type ZoneShape } from './zones'

const zone: ZoneShape = { id: 'cistella', room: 'sala', rect: { x: 0.4, y: 0.6, w: 0.2, h: 0.1 } }

/** Spawns and, when `inZone`, places it in the zone's first free slot. */
function put(items: Items, uid: string, def: string, inZone = false, qty?: number): Items {
  const added = itemsReducer(items, { type: 'add', item: makeItem(uid, def, { t: 'floor', room: 'sala', at: { x: 0.1, y: 0.8 } }, qty ? { qty } : {}) })
  if (!inZone) return added
  const at = freeSlot(added, zone)
  return at ? itemsReducer(added, { type: 'place', uid, room: 'sala', at, zone: zone.id }) : added
}

describe('zones', () => {
  it('lays ten slots out as a two-row ten-frame inside the rect', () => {
    const pts = slotPoints(zone)
    expect(pts).toHaveLength(10)
    expect(pts[0]?.y).toBe(pts[4]?.y)
    expect(pts[5]?.y).toBeGreaterThan(pts[0]?.y ?? 0)
    expect(pts.every((p) => inRect(zone.rect, p))).toBe(true)
    expect(slotPoints({ ...zone, capacity: 3, cols: 9 })).toHaveLength(3)
  })

  it('fills the first free slot, counts by def and reports full as undefined', () => {
    let items: Items = {}
    for (let n = 0; n < 7; n++) items = put(items, `p${n}`, 'poma', true)
    items = put(items, 'p-fora', 'poma')
    items = put(items, 'pera', 'pera', true)
    expect(zoneCounts(items, 'cistella')).toEqual({ poma: 7, pera: 1 })
    expect(zoneTotal(items, 'cistella')).toBe(8)
    expect(countItems(items, { zone: 'cistella', def: 'poma' })).toBe(7)
    expect(queryItems(items, { room: 'sala', def: 'poma' })).toHaveLength(8)
    expect(queryItems(items, { room: 'jardi' })).toHaveLength(0)
    items = put(put(items, 'x1', 'poma', true), 'x2', 'poma', true)
    expect(freeSlot(items, zone)).toBeUndefined()
  })

  it('stacks count their quantity; picking one frees its slot', () => {
    let items = put({}, 'm', 'moneda', true, 5)
    expect(zoneTotal(items, 'cistella')).toBe(5)
    items = itemsReducer(items, { type: 'pick', uid: 'm', by: 'laia' })
    expect(zoneTotal(items, 'cistella')).toBe(0)
    expect(items.m?.zone).toBeUndefined()
    expect(zoneItems(items, 'cistella')).toEqual([])
  })

  it('delete removes for good, gone keeps a ghost out of every count, qty never goes under one', () => {
    let items = put({}, 'a', 'poma', true)
    items = itemsReducer(items, { type: 'qty', uid: 'a', qty: -3 })
    expect(items.a?.qty).toBe(1)
    expect(zoneTotal(itemsReducer(items, { type: 'gone', uid: 'a' }), 'cistella')).toBe(0)
    expect(itemsReducer(items, { type: 'delete', uid: 'a' })).toEqual({})
    expect(itemsReducer(items, { type: 'delete', uid: 'zz' })).toBe(items)
  })

  it('property: n placed objects always give count n, in distinct slots', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (n) => {
        let items: Items = {}
        for (let k = 0; k < n; k++) items = put(items, `u${k}`, 'poma', true)
        const spots = new Set(Object.values(items).map((i) => (i.loc.t === 'floor' ? `${i.loc.at.x}/${i.loc.at.y}` : '')))
        return zoneTotal(items, 'cistella') === n && spots.size === n
      }),
    )
  })

  it('stand point is below the zone and counts keys are order independent', () => {
    expect(zoneStand(zone).y).toBeGreaterThan(0.7)
    expect(countsKey({ b: 1, a: 2 })).toBe(countsKey({ a: 2, b: 1 }))
  })
})
