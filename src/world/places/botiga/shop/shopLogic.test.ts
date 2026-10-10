import { describe, expect, it } from 'vitest'
import { makeItem, type Items } from '../../../sandbox/logic/itemsState'
import { arrivals, filledSlots, gramsLabel, productsAt, scaleReading, tillScan } from './shopLogic'

const floor = (uid: string, def: string, x: number, y: number) => makeItem(uid, def, { t: 'floor', room: 'botiga', at: { x, y } })
const world = (...list: ReturnType<typeof floor>[]): Items => Object.fromEntries(list.map((i) => [i.uid, i]))

describe('shopLogic', () => {
  it('reads grams and count of what lies on the scale', () => {
    const items = world(floor('a', 'poma', 0.5, 0.6), floor('b', 'poma', 0.52, 0.6), floor('c', 'platan', 0.9, 0.9))
    expect(scaleReading(items, 'botiga', { x: 0.5, y: 0.6 })).toEqual({ count: 2, grams: 300 })
  })
  it('ignores things in other rooms and non products', () => {
    const other = makeItem('z', 'poma', { t: 'floor', room: 'rebotiga', at: { x: 0.5, y: 0.6 } })
    const ball = floor('p', 'pilota', 0.5, 0.6)
    expect(productsAt(world(other, ball), 'botiga', { x: 0.5, y: 0.6 })).toEqual([])
  })
  it('totals the till in cents from the product prices', () => {
    const items = world(floor('a', 'poma', 0.3, 0.5), floor('b', 'llet', 0.31, 0.5))
    expect(tillScan(items, 'botiga', { x: 0.3, y: 0.5 }).cents).toBe(150)
  })
  it('formats grams and kilos', () => {
    expect(gramsLabel(450)).toBe('450 g')
    expect(gramsLabel(1500)).toBe('1,5 kg')
  })
  it('detects arrivals and filled slots', () => {
    expect(arrivals(['a'], ['a', 'b'])).toEqual(['b'])
    const items = world(floor('a', 'poma', 0.2, 0.3))
    expect(filledSlots(items, 'botiga', [{ id: 's1', at: { x: 0.2, y: 0.3 } }, { id: 's2', at: { x: 0.4, y: 0.3 } }])).toEqual(['s1'])
  })
})
