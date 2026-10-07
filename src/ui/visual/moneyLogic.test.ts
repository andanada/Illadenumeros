import { breakdown, changeDue, formatEuros, parseEuros, payStatus, pieceLabel, purseFor, sumCents } from './moneyLogic'

describe('moneyLogic', () => {
  it('formats euros with the Catalan comma', () => {
    expect(formatEuros(250)).toBe('2,50 €')
    expect(formatEuros(300)).toBe('3 €')
    expect(formatEuros(5)).toBe('0,05 €')
    expect(formatEuros(0)).toBe('0 €')
    expect(formatEuros(-10)).toBe('0 €')
  })
  it('labels pieces', () => {
    expect(pieceLabel(50)).toBe('50 cts')
    expect(pieceLabel(200)).toBe('2 €')
    expect(pieceLabel(1000)).toBe('10 €')
  })
  it('sums and computes change', () => {
    expect(sumCents([100, 50, 20])).toBe(170)
    expect(changeDue(175, 500)).toBe(325)
    expect(changeDue(500, 100)).toBe(0)
  })
  it('breaks an amount into the fewest pieces', () => {
    expect(breakdown(388)).toEqual([200, 100, 50, 20, 10, 5, 2, 1])
    expect(sumCents(breakdown(1234))).toBe(1234)
  })
  it('reports pay status', () => {
    expect(payStatus(90, 100)).toBe('short')
    expect(payStatus(100, 100)).toBe('exact')
    expect(payStatus(150, 100)).toBe('over')
  })
  it('offers a purse that can always reach the target', () => {
    for (const target of [30, 95, 150, 275, 640]) {
      const purse = purseFor(target)
      expect(purse.length).toBeLessThanOrEqual(16)
      expect(sumCents(purse)).toBeGreaterThanOrEqual(target)
    }
  })
  it('parses euro strings', () => {
    expect(parseEuros('2,50 €')).toBe(250)
    expect(parseEuros('3')).toBe(300)
    expect(parseEuros('0,5')).toBe(50)
    expect(parseEuros('50 cts')).toBe(50)
    expect(parseEuros('3 euros')).toBe(300)
    expect(parseEuros('res')).toBeUndefined()
  })
})
