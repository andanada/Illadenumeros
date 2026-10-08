import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Item, VisualModel } from '../../core/ambit/types'
import { makeTestItem } from '../shared/testUtils'
import {
  collectionCaption,
  equivalentViews,
  groupSize,
  paintedItems,
  planFromItem,
  sliceAngles,
  wholeCaption,
  toggleIndex,
} from './sliceLogic'

const base = (skillId: string, text: string, hintVisual: VisualModel): Item => ({
  id: 'x',
  skillId,
  text,
  speech: text,
  answer: '0',
  choices: [{ value: '0' }],
  visual: { kind: 'none' },
  hintVisual,
  hints: ['a', 'b', 'c'],
  cpaStage: 'concret',
})

describe('planFromItem', () => {
  it('plays "quina part està pintada" as a whole cake', () => {
    const plan = planFromItem(base('C8', 'Quina part està pintada?', { kind: 'fraction', parts: 4, selected: 3 }))
    expect(plan).toEqual({ mode: 'whole', parts: 4, selected: 3 })
  })

  it('plays a fraction of a collection by sharing it in groups', () => {
    const plan = planFromItem(base('D7', 'Quant és ¾ de 12?', { kind: 'fraction', parts: 4, selected: 3, collection: 12 }))
    expect(plan).toEqual({ mode: 'collection', parts: 4, selected: 3, total: 12 })
  })

  it('plays equivalent fractions by cutting, reading the target denominator', () => {
    const plan = planFromItem(base('E9', '2/3 = ?/6', { kind: 'fraction', parts: 3, selected: 2 }))
    expect(plan).toEqual({ mode: 'equivalent', parts: 3, selected: 2, targetParts: 6 })
  })

  it('has no target denominator for "simplifica" and "equivalent" questions', () => {
    const plan = planFromItem(base('E9', 'Simplifica 6/8.', { kind: 'fraction', parts: 8, selected: 6 }))
    expect(plan).toEqual({ mode: 'equivalent', parts: 8, selected: 6 })
  })

  it('falls back to plain choices when there is nothing to draw', () => {
    expect(planFromItem(base('E9', 'Simplifica 6/20.', { kind: 'none' })).mode).toBe('plain')
    expect(planFromItem(base('C8', 'Quina part està pintada?', { kind: 'fraction', parts: 40, selected: 3 })).mode).toBe('plain')
    expect(planFromItem(base('D7', 'Quant és ½ de 7?', { kind: 'fraction', parts: 2, selected: 1, collection: 7 })).mode).toBe('plain')
  })

  it('understands every real item the three fraction skills generate', () => {
    for (const skill of ['C8', 'D7', 'E9']) {
      for (let i = 0; i < 60; i++) {
        const item = makeTestItem(skill, undefined, 'concret', `plan-${skill}-${i}`)
        const plan = planFromItem(item)
        // E9 fractions with more than 12 parts have no cake to draw: they stay plain choices.
        const drawable = item.hintVisual.kind === 'fraction'
        expect(plan.mode === 'plain', `${skill}: ${item.text}`).toBe(!drawable)
      }
    }
  })
})

describe('sliceAngles', () => {
  it('cuts the circle in equal consecutive slices', () => {
    const slices = sliceAngles(4)
    expect(slices).toHaveLength(4)
    expect(slices[0]?.start).toBe(0)
    expect(slices[3]?.end).toBeCloseTo(Math.PI * 2)
    for (let i = 1; i < slices.length; i++) expect(slices[i]?.start).toBeCloseTo(slices[i - 1]?.end ?? NaN)
  })
})

describe('equivalentViews', () => {
  it('lists the multiples that still fit in 12 parts, in order', () => {
    expect(equivalentViews(3, 2)).toEqual([
      { parts: 3, selected: 2 },
      { parts: 6, selected: 4 },
      { parts: 9, selected: 6 },
      { parts: 12, selected: 8 },
    ])
  })

  it('also lists the simpler forms when the fraction can be simplified', () => {
    expect(equivalentViews(8, 6).map((v) => `${v.selected}/${v.parts}`)).toEqual(['3/4', '6/8'])
    expect(equivalentViews(12, 6).map((v) => `${v.selected}/${v.parts}`)).toEqual(['1/2', '2/4', '3/6', '6/12'])
  })

  it('keeps the same value in every view (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 12 }), fc.integer({ min: 1, max: 11 }), (parts, raw) => {
        const selected = Math.min(raw, parts - 1)
        for (const v of equivalentViews(parts, selected)) {
          expect(v.selected * parts).toBe(selected * v.parts)
          expect(v.parts).toBeLessThanOrEqual(12)
        }
      }),
    )
  })
})

describe('collections', () => {
  it('splits into equal groups and counts the painted items', () => {
    expect(groupSize(12, 4)).toBe(3)
    expect(paintedItems(12, 4, 3)).toBe(9)
    expect(paintedItems(12, 4, 0)).toBe(0)
    expect(paintedItems(12, 4, 99)).toBe(12)
  })

  it('captions guide the child step by step', () => {
    const plan = { mode: 'collection', parts: 4, selected: 3, total: 12 } as const
    expect(collectionCaption(plan, false, 0)).toBe('Reparteix en 4 grups iguals')
    expect(collectionCaption(plan, true, 0)).toBe('Toca 3 grups per pintar-los')
    expect(collectionCaption(plan, true, 1)).toBe('Toca 2 grups més')
    expect(collectionCaption(plan, true, 3)).toBe('3 grups de 3 = 9')
    expect(collectionCaption({ ...plan, selected: 1 }, true, 0)).toBe('Toca 1 grup per pintar-lo')
    expect(collectionCaption({ ...plan, selected: 1 }, true, 1)).toBe('1 grup de 3 = 3')
  })
})

describe('wholeCaption and toggleIndex', () => {
  it('counts the slices touched', () => {
    expect(wholeCaption(4, 0)).toBe('Toca els trossos pintats per comptar-los')
    expect(wholeCaption(4, 3)).toBe('3 de 4 trossos')
    expect(wholeCaption(4, 1)).toBe('1 de 4 trossos')
  })

  it('toggles without mutating', () => {
    const list = [1, 3] as const
    expect(toggleIndex(list, 2)).toEqual([1, 2, 3])
    expect(toggleIndex(list, 1)).toEqual([3])
    expect(list).toEqual([1, 3])
  })
})
