import { describe, expect, it } from 'vitest'
import { makeItem, type Items } from '../../../sandbox/logic/itemsState'
import { pendingTransforms, type TransformRule } from './zoneTransform'

const rules: readonly TransformRule[] = [{ zone: 'forn', from: 'pasta-croissant', to: 'croissant-calent', said: 'Cuit!' }]
const at = { t: 'floor', room: 'obrador', at: { x: 0.5, y: 0.5 } } as const

describe('pendingTransforms', () => {
  it('finds raw things lying in the oven only', () => {
    const items: Items = {
      a: makeItem('a', 'pasta-croissant', at, { zone: 'forn' }),
      b: makeItem('b', 'pasta-croissant', at),
      c: makeItem('c', 'croissant-calent', at, { zone: 'forn' }),
      d: makeItem('d', 'pasta-croissant', at, { zone: 'safata' }),
    }
    expect(pendingTransforms(items, rules).map((p) => p.uid)).toEqual(['a'])
  })
  it('ignores things in hand or gone', () => {
    const items: Items = { a: { ...makeItem('a', 'pasta-croissant', { t: 'held', by: 'laia' }), zone: 'forn' } }
    expect(pendingTransforms(items, rules)).toEqual([])
  })
})
