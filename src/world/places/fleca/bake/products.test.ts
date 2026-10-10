import { describe, expect, it } from 'vitest'
import type { Items } from '../../../sandbox/logic/itemsState'
import { makeItem } from '../../../sandbox/logic/itemsState'
import { pendingTransforms } from '../../shared/doing/zoneTransform'
import { BAKE_RULES, OVEN, productFor, PRODUCTS, RACK } from './products'

const at = { t: 'floor', room: 'obrador', at: { x: 0.5, y: 0.5 } } as const

describe('bakery chain', () => {
  it('bakes raw dough in the oven and cools it on the rack, never the other way round', () => {
    const items: Items = { a: makeItem('a', 'pasta-croissant', at, { zone: OVEN }), b: makeItem('b', 'croissant-calent', at, { zone: RACK }), c: makeItem('c', 'croissant-calent', at, { zone: OVEN }) }
    const todo = pendingTransforms(items, BAKE_RULES).map((p) => `${p.uid}>${p.rule.to}`)
    expect(todo.sort()).toEqual(['a>croissant-calent', 'b>croissant'])
  })
  it('has three products with stable defs', () => {
    expect(PRODUCTS.map((p) => p.id)).toEqual(['magdalena', 'croissant', 'baguette'])
    expect(productFor('r1')).toBe(productFor('r1'))
  })
})
