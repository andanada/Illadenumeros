import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import { evaluateShare, leftoverSaid, shareFromItem, shareRequest, SHARE_MAX_PARTS } from './shareLogic'

const base: Item = { id: 'x', skillId: 'C7', text: '42 : 6 = ?', speech: '', answer: '7', choices: [{ value: '7' }], visual: { kind: 'none' }, hintVisual: { kind: 'none' }, hints: ['a', 'b', 'c'], cpaStage: 'concret', operands: { a: 42, b: 6, op: ':' } }
const it2 = (patch: Partial<Item>): Item => ({ ...base, ...patch })

describe('shareFromItem', () => {
  it('shares a among b animals (each gets q)', () => {
    expect(shareFromItem(it2({ text: '12 : 4 = ?', answer: '3', operands: { a: 12, b: 4, op: ':' } }))).toEqual({ mode: 'each', total: 12, size: 4, parts: 4, expected: 3, remainder: 0 })
  })
  it('puts a in cartons / plates of b (groups)', () => {
    const t = shareFromItem(it2({ text: 'Mixa posa 12 galetes en plats de 3. Quants plats omple?', answer: '4', operands: { a: 12, b: 3, op: ':' } }))
    expect(t).toMatchObject({ mode: 'groups', parts: 4, size: 3, expected: 4 })
  })
  it('asks the remainder (en sobren) or the quotient with a remainder', () => {
    const rest = shareFromItem(it2({ text: '23 : 8. Quin és el residu?', answer: '7', operands: { a: 23, b: 8, op: ':' } }))
    expect(rest).toMatchObject({ mode: 'remainder', expected: 7, remainder: 7, parts: 8 })
    const quo = shareFromItem(it2({ text: '27 : 5. Quin és el quocient?', answer: '5', operands: { a: 27, b: 5, op: ':' } }))
    expect(quo).toMatchObject({ mode: 'each', expected: 5, remainder: 2 })
  })
  it('refuses what does not fit', () => {
    expect(shareFromItem(it2({ operands: undefined }))).toBeUndefined()
    expect(shareFromItem(it2({ operands: { a: 42, b: 2, op: ':' }, answer: '21' }))).toBeUndefined()
    expect(shareFromItem(it2({ answer: '8' }))).toBeUndefined()
    expect(shareFromItem(it2({ operands: { a: 6, b: 3, op: '×' }, answer: '2' }))).toBeUndefined()
    expect(SHARE_MAX_PARTS).toBe(8)
  })
})

describe('evaluateShare', () => {
  const each = { mode: 'each', total: 12, size: 4, parts: 4, expected: 3, remainder: 0 } as const
  it('is not ready until every bowl holds the same, then answers with that', () => {
    expect(evaluateShare(each, [3, 3, 2, 3], 1)).toEqual({ ready: false, value: undefined, left: 1 })
    expect(evaluateShare(each, [0, 0, 0, 0], 12).ready).toBe(false)
    expect(evaluateShare(each, [3, 3, 3, 3], 0)).toEqual({ ready: true, value: 3, left: 0 })
  })
  it('remainder mode answers with what is left in the pile', () => {
    const t = { mode: 'remainder', total: 23, size: 8, parts: 8, expected: 7, remainder: 7 } as const
    expect(evaluateShare(t, [2, 2, 2, 2, 2, 2, 2, 2], 7)).toEqual({ ready: true, value: 7, left: 7 })
  })
  it('groups mode counts the full cartons', () => {
    const t = { mode: 'groups', total: 12, size: 3, parts: 4, expected: 4, remainder: 0 } as const
    expect(evaluateShare(t, [3, 3, 1, 0], 5)).toEqual({ ready: true, value: 2, left: 5 })
    expect(evaluateShare(t, [1, 0, 0, 0], 11).ready).toBe(false)
  })
})

describe('words', () => {
  it('leftover says «en sobren» only when something is left', () => {
    expect(leftoverSaid(0)).toBe('')
    expect(leftoverSaid(1)).toBe('En sobra 1.')
    expect(leftoverSaid(3)).toBe('En sobren 3.')
  })
  it('requests speak in Catalan', () => {
    expect(shareRequest({ mode: 'each', total: 12, size: 4, parts: 4, expected: 3, remainder: 0 }).text).toMatch(/12 .* 4 animals/)
    expect(shareRequest({ mode: 'groups', total: 12, size: 6, parts: 2, expected: 2, remainder: 0 }).text).toMatch(/caixes de 6/)
  })
})
