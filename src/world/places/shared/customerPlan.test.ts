import { describe, expect, it } from 'vitest'
import { freeSpot, planCustomers } from './customerPlan'

const order = ['a', 'b', 'c']

describe('planCustomers', () => {
  it('lets one customer in when the shop is empty', () => {
    expect(planCustomers({}, { order, now: 10_000 })).toEqual([{ type: 'enter', id: 'a' }])
  })
  it('waits the gap between two arrivals and respects the maximum', () => {
    expect(planCustomers({ a: 8000 }, { order, now: 10_000, lastEnter: 8000 })).toEqual([])
    expect(planCustomers({ a: 0, b: 1000 }, { order, now: 9000, lastEnter: 1000 })).toEqual([])
  })
  it('sends away who stayed long, but never the carrier of a request', () => {
    const moves = planCustomers({ a: 0, b: 0 }, { order, now: 20_000, carrier: 'b', lastEnter: 20_000 })
    expect(moves).toEqual([{ type: 'leave', id: 'a' }])
  })
  it('brings the carrier in first', () => {
    expect(planCustomers({ a: 5000 }, { order, carrier: 'c', now: 6000, lastEnter: 5000 })).toEqual([{ type: 'enter', id: 'c' }])
  })
  it('picks a free counter spot', () => {
    expect(freeSpot([{ id: 'x' }, { id: 'y' }], ['x'])).toEqual({ id: 'y' })
    expect(freeSpot([{ id: 'x' }], ['x'])).toBeUndefined()
  })
})

describe('keep', () => {
  it('does not send away someone who is being served', () => {
    expect(planCustomers({ a: 0 }, { order, now: 99_000, keep: ['a'], lastEnter: 99_000 })).toEqual([])
  })
})
