import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { balanceState, beamAngle, expressionTokens, leftValue, missingValue, parseEquation, type Equation } from './scaleLogic'

const eq = (text: string): Equation => {
  const parsed = parseEquation(text)
  if (!parsed) throw new Error(`no parse: ${text}`)
  return parsed
}

describe('parseEquation', () => {
  it('reads the addition forms of A10', () => {
    expect(parseEquation('? + 3 = 8')).toEqual({ a: 'hidden', op: '+', b: 3, result: 8 })
    expect(parseEquation('5 + ? = 12')).toEqual({ a: 5, op: '+', b: 'hidden', result: 12 })
  })

  it('reads the × and : forms of D9', () => {
    expect(parseEquation('? × 4 = 28')).toEqual({ a: 'hidden', op: '×', b: 4, result: 28 })
    expect(parseEquation('4 × ? = 28')).toEqual({ a: 4, op: '×', b: 'hidden', result: 28 })
    expect(parseEquation('36 : ? = 9')).toEqual({ a: 36, op: ':', b: 'hidden', result: 9 })
    expect(parseEquation('? : 4 = 9')).toEqual({ a: 'hidden', op: ':', b: 4, result: 9 })
  })

  it('reads subtraction with a minus sign or a hyphen, and the reversed layout', () => {
    expect(parseEquation('9 − ? = 4')).toEqual({ a: 9, op: '−', b: 'hidden', result: 4 })
    expect(parseEquation('9 - ? = 4')?.op).toBe('−')
    expect(parseEquation('10 = 3 + ?')).toEqual({ a: 3, op: '+', b: 'hidden', result: 10 })
  })

  it('rejects anything that is not an equation with exactly one hidden operand', () => {
    expect(parseEquation('Quant és ½ de 12?')).toBeUndefined()
    expect(parseEquation('3 + 4 = ?')).toBeUndefined()
    expect(parseEquation('? + ? = 8')).toBeUndefined()
    expect(parseEquation('3 + 4 = 7')).toBeUndefined()
  })
})

describe('missingValue', () => {
  it.each([
    ['? + 3 = 8', 5],
    ['3 + ? = 8', 5],
    ['? × 4 = 28', 7],
    ['4 × ? = 28', 7],
    ['36 : ? = 9', 4],
    ['? : 4 = 9', 36],
    ['9 − ? = 4', 5],
    ['? − 4 = 5', 9],
  ])('%s -> %i', (text, expected) => {
    expect(missingValue(eq(text))).toBe(expected)
  })

  it('is undefined when there is no whole answer', () => {
    expect(missingValue(eq('? × 4 = 30'))).toBeUndefined()
    expect(missingValue(eq('? + 9 = 4'))).toBeUndefined()
    expect(missingValue(eq('? × 0 = 5'))).toBeUndefined()
  })

  it('always balances the scale (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 12 }), fc.constantFrom('+', '×'), (known, hidden, op) => {
        const result = op === '+' ? known + hidden : known * hidden
        const e = eq(`? ${op} ${known} = ${result}`)
        expect(missingValue(e)).toBe(hidden)
        expect(balanceState(e, hidden).verdict).toBe('balanced')
      }),
    )
  })
})

describe('leftValue and balanceState', () => {
  it('an empty slot weighs nothing', () => {
    expect(leftValue(eq('? + 3 = 8'), null)).toBe(3)
    expect(leftValue(eq('? × 4 = 28'), null)).toBe(0)
    expect(leftValue(eq('36 : ? = 9'), null)).toBe(0)
  })

  it('tips towards the heavier side', () => {
    expect(balanceState(eq('? + 3 = 8'), 2).verdict).toBe('right-heavy')
    expect(balanceState(eq('? + 3 = 8'), 9).verdict).toBe('left-heavy')
    expect(balanceState(eq('? + 3 = 8'), 5).verdict).toBe('balanced')
    expect(balanceState(eq('? + 3 = 8'), null).verdict).toBe('right-heavy')
  })

  it('never divides by zero', () => {
    expect(Number.isFinite(leftValue(eq('36 : ? = 9'), 0))).toBe(true)
    expect(balanceState(eq('36 : ? = 9'), 4).verdict).toBe('balanced')
    expect(balanceState(eq('36 : ? = 9'), 3).verdict).toBe('left-heavy')
  })
})

describe('beamAngle', () => {
  it('is zero when balanced and clockwise when the right side is heavier', () => {
    expect(beamAngle(8, 8)).toBe(0)
    expect(beamAngle(3, 8)).toBeGreaterThan(0)
    expect(beamAngle(9, 8)).toBeLessThan(0)
  })

  it('stays inside the visual limit and always shows a small tilt when unbalanced', () => {
    expect(beamAngle(0, 1000)).toBeLessThanOrEqual(14)
    expect(beamAngle(1000, 0)).toBeGreaterThanOrEqual(-14)
    expect(Math.abs(beamAngle(8, 9))).toBeGreaterThanOrEqual(5)
  })
})

describe('expressionTokens', () => {
  it('puts the slot where the number is hidden', () => {
    expect(expressionTokens(eq('? + 3 = 8'), null)).toEqual([
      { kind: 'slot', text: '?' },
      { kind: 'op', text: '+' },
      { kind: 'number', text: '3' },
    ])
  })

  it('fills the slot with the guess', () => {
    expect(expressionTokens(eq('36 : ? = 9'), 4).map((t) => t.text)).toEqual(['36', ':', '4'])
    expect(expressionTokens(eq('36 : ? = 9'), 4)[2]?.kind).toBe('slot')
  })
})
