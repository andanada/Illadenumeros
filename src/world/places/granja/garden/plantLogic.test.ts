import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import { plantFromItem, plantRequest, plotZone, PLANT_MAX } from './plantLogic'

const base: Item = { id: 'x', skillId: 'C4', text: '5 × 6 = ?', speech: '', answer: '30', choices: [{ value: '30' }], visual: { kind: 'none' }, hintVisual: { kind: 'none' }, hints: ['a', 'b', 'c'], cpaStage: 'concret', operands: { a: 5, b: 6, op: '×' } }

describe('plantFromItem', () => {
  it('turns a × b into rows × columns of seeds', () => {
    expect(plantFromItem(base)).toEqual({ rows: 5, cols: 6, total: 30 })
  })
  it('turns the plot round when that is the way it fits', () => {
    expect(plantFromItem({ ...base, operands: { a: 10, b: 3, op: '×' }, answer: '30' })).toEqual({ rows: 3, cols: 10, total: 30 })
  })
  it('refuses what does not fit a plot or is not a product', () => {
    expect(plantFromItem({ ...base, operands: { a: 9, b: 8, op: '×' }, answer: '72' })).toBeUndefined()
    expect(plantFromItem({ ...base, operands: { a: 10, b: 0, op: '×' }, answer: '0' })).toBeUndefined()
    expect(plantFromItem({ ...base, operands: { a: 6, b: 2, op: ':' }, answer: '3' })).toBeUndefined()
    expect(plantFromItem({ ...base, operands: undefined })).toBeUndefined()
    expect(plantFromItem({ ...base, answer: '31' })).toBeUndefined()
    expect(PLANT_MAX).toBe(40)
  })
})

describe('plotZone', () => {
  it('has one slot per seed, cols wide, and stays inside the stage', () => {
    const z = plotZone({ rows: 5, cols: 6, total: 30 }, 'hort')
    expect(z).toMatchObject({ id: 'parcel', room: 'hort', capacity: 30, cols: 6 })
    expect(z.rect.x).toBeGreaterThanOrEqual(0)
    expect(z.rect.x + z.rect.w).toBeLessThanOrEqual(1)
    expect(z.rect.y + z.rect.h).toBeLessThanOrEqual(1)
  })
})

describe('plantRequest', () => {
  it('speaks rows and seeds per row in Catalan', () => {
    expect(plantRequest({ rows: 5, cols: 6, total: 30 }).text).toBe('Vull 5 files de 6 llavors a l’hort! Planta-les en files.')
    expect(plantRequest({ rows: 1, cols: 4, total: 4 }).text).toContain('1 fila de 4 llavors')
  })
})
