import { describe, expect, it } from 'vitest'
import { makeItem, type Items } from '../../../sandbox/logic/itemsState'
import { looseOf, solutionMoves, zoneDefs, zoneSlots } from './pileTask'

const floor = { t: 'floor', room: 'r', at: { x: 0.5, y: 0.5 } } as const

describe('zoneDefs', () => {
  it('lists one def per thing, stacks by quantity, only what lies in the zone', () => {
    const items: Items = {
      a: makeItem('a', 'poma', floor, { zone: 'cistella' }),
      b: makeItem('b', 'poma', floor, { zone: 'cistella' }),
      c: makeItem('c', 'taronja', floor, { zone: 'cistella', qty: 3 }),
      d: makeItem('d', 'poma', floor),
      e: makeItem('e', 'poma', floor, { zone: 'altra' }),
    }
    expect(zoneDefs(items, 'cistella').sort()).toEqual(['poma', 'poma', 'taronja', 'taronja', 'taronja'])
  })
})

describe('zoneSlots', () => {
  it('rounds up to whole rows and never goes below a ten-frame', () => {
    expect(zoneSlots(4, 5)).toBe(10)
    expect(zoneSlots(14, 5)).toBe(15)
    expect(zoneSlots(22, 5)).toBe(25)
    expect(zoneSlots(14, 4, 0)).toBe(16)
  })
})

describe('solutionMoves', () => {
  const t = (uid: string, def: string) => ({ uid, def })

  it('brings loose things in until the zone matches the solution', () => {
    const moves = solutionMoves([t('a', 'poma')], [t('b', 'poma'), t('c', 'poma'), t('d', 'poma')], ['poma', 'poma', 'poma'])
    expect(moves).toEqual({ out: [], into: ['b', 'c'], make: [] })
  })

  it('sends the extra things away and makes what no loose thing can give', () => {
    const moves = solutionMoves([t('a', 'poma'), t('b', 'poma'), t('c', 'taronja')], [], ['poma', 'peca-50'])
    expect(moves.out).toEqual(['b', 'c'])
    expect(moves.into).toEqual([])
    expect(moves.make).toEqual(['peca-50'])
  })

  it('does nothing when the zone already holds the solution', () => {
    expect(solutionMoves([t('a', 'peca-100'), t('b', 'peca-50')], [t('c', 'peca-100')], ['peca-50', 'peca-100'])).toEqual({ out: [], into: [], make: [] })
  })

  it('uses each loose thing once', () => {
    const moves = solutionMoves([], [t('x', 'peca-20')], ['peca-20', 'peca-20'])
    expect(moves).toEqual({ out: [], into: ['x'], make: ['peca-20'] })
  })
})

describe('looseOf', () => {
  it('keeps only my things that lie on the floor outside any zone', () => {
    const items: Items = {
      a: makeItem('a', 'poma', floor),
      b: makeItem('b', 'poma', floor, { zone: 'cistella' }),
      c: makeItem('c', 'poma', { t: 'held', by: 'laia' }),
      d: makeItem('d', 'poma', { t: 'gone' }),
    }
    expect(looseOf(items, ['a', 'b', 'c', 'd', 'zzz']).map((i) => i.uid)).toEqual(['a'])
  })
})
