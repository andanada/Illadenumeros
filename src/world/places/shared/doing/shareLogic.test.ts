import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import { partFromItem, shareAnswer, shareCaption, shareFinished, shareFromItem } from './shareLogic'

const item = (over: Partial<Item>): Item =>
  ({ id: 'x', skillId: 'C7', text: '12 : 3 = ?', speech: '', answer: '4', choices: [], hints: ['', '', ''], visual: { kind: 'share', total: 12, groups: 3 }, hintVisual: { kind: 'none' }, cpaStage: 'concret', operands: { a: 12, b: 3, op: ':' }, ...over }) as Item

describe('shareFromItem', () => {
  it('maps a sharing item to groups and total', () => {
    expect(shareFromItem(item({}))).toEqual({ total: 12, groups: 3, ask: 'quotient' })
  })
  it('asks for the remainder when the text talks about leftovers', () => {
    expect(shareFromItem(item({ text: '14 : 4. Quin és el residu?', operands: { a: 14, b: 4, op: ':' }, visual: { kind: 'share', total: 14, groups: 4 } }))?.ask).toBe('remainder')
  })
  it('leaves big or plain items to the sheet', () => {
    expect(shareFromItem(item({ visual: { kind: 'none' }, operands: undefined }))).toBeUndefined()
    expect(shareFromItem(item({ operands: { a: 80, b: 8, op: ':' }, visual: { kind: 'share', total: 80, groups: 8 } }))).toBeUndefined()
  })
})

describe('sharing', () => {
  it('is finished only when every group has the same and fewer are left than groups', () => {
    expect(shareFinished([2, 2, 2], 6)).toBe(false)
    expect(shareFinished([4, 3, 4], 0)).toBe(false)
    expect(shareFinished([4, 4, 4], 0)).toBe(true)
    expect(shareFinished([3, 3, 3], 2)).toBe(true)
  })
  it('answers with the share or with what is left over', () => {
    expect(shareAnswer([4, 4, 4], 0, 'quotient')).toBe(4)
    expect(shareAnswer([3, 3, 3], 2, 'remainder')).toBe(2)
    expect(shareAnswer([3, 3, 2], 0, 'quotient')).toBeUndefined()
  })
  it('captions never show the answer', () => {
    expect(shareCaption([1, 0, 0], 11, 3)).toMatch(/mateix/i)
  })
})

describe('fraction of a collection', () => {
  const frac = (over: Partial<Item>): Item => item({ skillId: 'D7', text: 'Quant és ¾ de 12?', answer: '9', operands: undefined, visual: { kind: 'fraction', parts: 4, selected: 3, collection: 12 }, hintVisual: { kind: 'fraction', parts: 4, selected: 3, collection: 12 }, ...over })
  it('shares in the parts and answers with the selected groups', () => {
    const t = partFromItem(frac({}))
    expect(t).toEqual({ total: 12, groups: 4, ask: 'part', take: 3 })
    expect(shareAnswer([3, 3, 3, 3], 0, 'part', 3)).toBe(9)
  })
  it('ignores wholes and equivalent fractions', () => {
    expect(partFromItem(frac({ hintVisual: { kind: 'fraction', parts: 4, selected: 3 } }))).toBeUndefined()
    expect(partFromItem(frac({ skillId: 'E9' }))).toBeUndefined()
  })
})
