import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import { arrayFromItem, spareRows } from './arrayTask'

const item = (a: number, b: number, over: Partial<Item> = {}): Item =>
  ({ id: 'x', skillId: 'C4', text: `${a} × ${b} = ?`, speech: '', answer: String(a * b), choices: [], hints: ['', '', ''], visual: { kind: 'array', rows: a, cols: b }, hintVisual: { kind: 'none' }, cpaStage: 'concret', operands: { a, b, op: '×' }, ...over }) as Item

describe('arrayFromItem', () => {
  it('turns a × b into a rows × columns task', () => {
    expect(arrayFromItem(item(3, 6))).toEqual({ rows: 3, cols: 6 })
  })
  it('leaves zero, huge and 2-digit products to the sheet', () => {
    expect(arrayFromItem(item(0, 6, { answer: '0', visual: { kind: 'none' } }))).toBeUndefined()
    expect(arrayFromItem(item(23, 4))).toBeUndefined()
    expect(arrayFromItem(item(9, 9))).toBeUndefined()
  })
  it('gives spare rows once past the concrete stage', () => {
    expect(spareRows(item(3, 6))).toBe(0)
    expect(spareRows(item(3, 6, { cpaStage: 'abstracte' }))).toBe(2)
  })
})
