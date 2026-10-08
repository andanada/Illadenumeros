import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { PRODUCTS } from './products'
import { clearTill, deliveryKind, initialShop, parseKind, petCat, restock, ringUp, SHELF_CAPACITY, SHELF_IDS, shelfKind, tillDisplay, tillTotal, toggleFridge, type ShopState } from './freePlay'

const count = (s: ShopState): number => s.delivery.length + s.till.length + SHELF_IDS.reduce((n, id) => n + s.shelves[id].length, 0)

describe('shop free play', () => {
  it('restocks from the delivery box until a shelf is full', () => {
    let s = initialShop()
    s = restock(s, 'prestatge-baix', 'platan')
    expect(s.shelves['prestatge-baix']).toEqual(['platan'])
    expect(s.delivery.filter((p) => p === 'platan')).toHaveLength(1)
    expect(restock(s, 'prestatge-baix', 'res')).toBe(s)
    const full = { ...s, shelves: { ...s.shelves, 'prestatge-baix': Array(SHELF_CAPACITY).fill('poma') } }
    expect(restock(full, 'prestatge-baix', 'poma')).toBe(full)
  })

  it('rings up, totals and clears the till back into the box', () => {
    let s = ringUp(initialShop(), 'prestatge-dalt', 0)
    expect(s.till).toEqual(['barra-pa'])
    expect(tillTotal(s)).toBe(120)
    expect(tillDisplay(s)).toBe('1,20 €')
    expect(ringUp(s, 'prestatge-baix', 3)).toBe(s)
    s = clearTill(s)
    expect(s.till).toEqual([])
    expect(s.delivery).toContain('barra-pa')
  })

  it('fridge and cat cycle', () => {
    const s = initialShop()
    expect(toggleFridge(toggleFridge(s)).fridgeOpen).toBe(false)
    expect(petCat(s).cat).toBe('awake')
    expect(petCat(petCat(petCat(s))).cat).toBe('sleep')
  })

  it('parses prop kinds', () => {
    expect(parseKind(deliveryKind('poma'))).toEqual({ from: 'entrega', product: 'poma' })
    expect(parseKind(shelfKind('prestatge-mig', 2, 'barra-pa'))).toEqual({ from: 'prestatge', shelf: 'prestatge-mig', index: 2 })
    expect(parseKind('entrega:res')).toBeUndefined()
    expect(parseKind('tag')).toBeUndefined()
  })

  it('property: playing never creates nor loses products', () => {
    const action = fc.oneof(
      fc.record({ t: fc.constant('restock' as const), shelf: fc.constantFrom(...SHELF_IDS), product: fc.constantFrom(...PRODUCTS.map((p) => p.id)) }),
      fc.record({ t: fc.constant('ring' as const), shelf: fc.constantFrom(...SHELF_IDS), index: fc.integer({ min: 0, max: 6 }) }),
      fc.record({ t: fc.constant('clear' as const) }),
    )
    fc.assert(
      fc.property(fc.array(action, { maxLength: 40 }), (actions) => {
        const start = initialShop()
        const end = actions.reduce<ShopState>((s, a) => (a.t === 'restock' ? restock(s, a.shelf, a.product) : a.t === 'ring' ? ringUp(s, a.shelf, a.index) : clearTill(s)), start)
        expect(count(end)).toBe(count(start))
        for (const id of SHELF_IDS) expect(end.shelves[id].length).toBeLessThanOrEqual(SHELF_CAPACITY)
      }),
    )
  })
})
