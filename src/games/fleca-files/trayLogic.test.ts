import type { Item } from '../../core/ambit/types'
import { nextSlot, partialProducts, planFromItem, splitCaption, splitColumns, toBlocks, trayCaption } from './trayLogic'

const base: Item = {
  id: 'x',
  skillId: 'C3',
  text: '3 × 4 = ?',
  speech: '',
  answer: '12',
  choices: [{ value: '12' }],
  visual: { kind: 'none' },
  hintVisual: { kind: 'none' },
  hints: ['', '', ''],
  cpaStage: 'concret',
}

describe('trayLogic', () => {
  it('plans an array tray from operands', () => {
    expect(planFromItem({ ...base, operands: { a: 3, b: 4, op: '×' } })).toEqual({ mode: 'array', rows: 3, cols: 4 })
  })
  it('plans partial products for 2-digit x 1-digit', () => {
    expect(planFromItem({ ...base, operands: { a: 23, b: 4, op: '×' } })).toEqual({ mode: 'partials', a: 23, b: 4 })
  })
  it('falls back to the array visual, then to plain', () => {
    expect(planFromItem({ ...base, visual: { kind: 'array', rows: 2, cols: 5 } })).toEqual({ mode: 'array', rows: 2, cols: 5 })
    expect(planFromItem(base)).toEqual({ mode: 'plain' })
    expect(planFromItem({ ...base, operands: { a: 6, b: 3, op: '+' } })).toEqual({ mode: 'plain' })
  })
  it('captions the tray as it fills', () => {
    expect(trayCaption(3, 4, 0)).toBe('Fes 3 files de 4')
    expect(trayCaption(3, 4, 3)).toBe('3')
    expect(trayCaption(3, 4, 4)).toBe('1 fila de 4 = 4')
    expect(trayCaption(3, 4, 9)).toBe('2 files de 4 + 1 = 9')
    expect(trayCaption(3, 4, 12)).toBe('3 files de 4 = 12')
    expect(trayCaption(3, 4, 99)).toBe('3 files de 4 = 12')
  })
  it('finds the next slot', () => {
    expect(nextSlot(0, 12)).toBe(0)
    expect(nextSlot(11, 12)).toBe(11)
    expect(nextSlot(12, 12)).toBeUndefined()
  })
  it('splits columns for strategy hints', () => {
    expect(splitColumns(7)).toEqual([5, 2])
    expect(splitColumns(4)).toEqual([2, 2])
    expect(splitColumns(3)).toBeUndefined()
    expect(splitCaption(6, 7)).toBe('6 × 5 + 6 × 2 = 30 + 12')
  })
  it('computes partial products and blocks', () => {
    expect(partialProducts(23, 4)).toEqual([
      { label: '20 × 4', value: 80 },
      { label: '3 × 4', value: 12 },
    ])
    expect(toBlocks(112)).toEqual({ hundreds: 1, tens: 1, ones: 2 })
  })
})
