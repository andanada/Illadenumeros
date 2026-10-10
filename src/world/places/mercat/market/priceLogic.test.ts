import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import { coinPile, discountOf, formatKg, formatLike, scaleFromItem, toCents, trayFromItem, trayRequest } from './priceLogic'

const base: Item = { id: 'x', skillId: 'E3', text: '6,3 + 3,9 = ?', speech: '', answer: '10,2', choices: [{ value: '10,2' }], visual: { kind: 'none' }, hintVisual: { kind: 'none' }, hints: ['a', 'b', 'c'], cpaStage: 'concret' }
const it2 = (patch: Partial<Item>): Item => ({ ...base, ...patch })

describe('decimal text', () => {
  it('reads Catalan decimals into cents', () => {
    expect(toCents('6,3')).toBe(630)
    expect(toCents('10,2')).toBe(1020)
    expect(toCents('2,01')).toBe(201)
    expect(toCents('45,00 €')).toBe(4500)
    expect(toCents('7')).toBe(700)
    expect(toCents('hola')).toBeUndefined()
  })
  it('writes an amount like the item writes its answer', () => {
    expect(formatLike('10,2', 1020)).toBe('10,2')
    expect(formatLike('2,01', 201)).toBe('2,01')
    expect(formatLike('10', 1000)).toBe('10')
    expect(formatLike('45,00 €', 4500)).toBe('45,00 €')
    expect(formatLike('5,00 €', 505)).toBe('5,05 €')
  })
  it('writes kilos', () => {
    expect(formatKg(0)).toBe('0 kg')
    expect(formatKg(500)).toBe('0,5 kg')
    expect(formatKg(1900)).toBe('1,9 kg')
    expect(formatKg(2000)).toBe('2 kg')
  })
})

describe('trayFromItem', () => {
  it('adds two prices: pay the total', () => {
    const t = trayFromItem(base)
    expect(t).toMatchObject({ kind: 'sum', target: 1020, a: 630, b: 390 })
    expect(t && trayRequest(t).text).toMatch(/6,30 € .* 3,90 €/)
  })
  it('subtracts: the money left', () => {
    const t = trayFromItem(it2({ text: '11,31 − 9,3 = ?', answer: '2,01' }))
    expect(t).toMatchObject({ kind: 'diff', target: 201, a: 1131, b: 930 })
  })
  it('a discounted price: take the tag off and pay the new price', () => {
    const item = it2({ skillId: 'E10', text: 'Un joc de taula costa 60,00 €. Té un descompte del 25 %. Quant costa ara?', answer: '45,00 €' })
    const t = trayFromItem(item)
    expect(t).toMatchObject({ kind: 'price', target: 4500, sign: { price: 6000, percent: 25 } })
    expect(t && trayRequest(t, item.text).text).toMatch(/costa 60,00 €.*Treu l’etiqueta del 25 %/)
  })
  it('refuses what is not an amount to pay', () => {
    expect(trayFromItem(it2({ text: 'Mixa té 6,97 m de cinta i en gasta 3,8 m. Quants metres en queden?', answer: '3,17' }))).toBeUndefined()
    expect(trayFromItem(it2({ answer: '10,3' }))).toBeUndefined()
    expect(trayFromItem(it2({ text: '0,46 ? 0,5', answer: '<' }))).toBeUndefined()
  })
})

describe('discountOf', () => {
  it('reads the price and the percent from the sentence', () => {
    expect(discountOf('Una pilota costa 20,00 € i té un descompte del 10 %. Núvol paga')).toEqual({ price: 2000, percent: 10 })
    expect(discountOf('res')).toBeUndefined()
  })
})

describe('coinPile', () => {
  it('always holds the exact pieces and some extra, never too many', () => {
    for (const target of [201, 1020, 4500, 5, 9999]) {
      const pile = coinPile(target)
      expect(pile.length).toBeLessThanOrEqual(16)
      expect(pile.reduce((a, b) => a + b, 0)).toBeGreaterThan(target)
    }
  })
})

describe('scaleFromItem', () => {
  it('turns «quantes dècimes» into bags of a tenth of a kilo', () => {
    const item = it2({ skillId: 'E1', text: 'Quantes dècimes hi ha en 1,9?', answer: '19' })
    expect(scaleFromItem(item)).toEqual({ kg: '1,9', tenths: 19 })
    expect(scaleFromItem(it2({ text: 'Quantes dècimes hi ha en 1,9?', answer: '18' }))).toBeUndefined()
    expect(scaleFromItem(it2({ text: 'Quantes dècimes hi ha en 9,9?', answer: '99' }))).toBeUndefined()
    expect(scaleFromItem(base)).toBeUndefined()
  })
})
