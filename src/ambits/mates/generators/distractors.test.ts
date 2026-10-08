import { describe, expect, it } from 'vitest'
import { createRng } from '../../../core/rng'
import { buildChoices, buildTextChoices, columnNoBorrow, columnNoCarry, divisionCandidates, multiplicationCandidates } from './distractors'

const valuesOf = (list: { value: number; misconception: string }[], misconception: string): number[] =>
  list.filter((c) => c.misconception === misconception).map((c) => c.value)

describe('typical-error distractors for 3r and 4t', () => {
  it('7 × 8 offers the wrong neighbours of the table and the sum', () => {
    const list = multiplicationCandidates(7, 8)
    expect(valuesOf(list, 'adjacent-fact').sort()).toEqual([48, 49, 63, 64])
    expect(valuesOf(list, 'mult-as-add')).toEqual([15])
    expect(list.map((c) => c.value)).not.toContain(56)
  })

  it('never proposes zero or the right product', () => {
    for (const c of multiplicationCandidates(1, 1)) expect(c.value).toBeGreaterThan(0)
    expect(multiplicationCandidates(1, 1).map((c) => c.value)).not.toContain(1)
  })

  it('42 : 6 offers neighbours and division read as subtraction', () => {
    const list = divisionCandidates(42, 6)
    expect(valuesOf(list, 'adjacent-fact').sort()).toEqual([6, 8])
    expect(valuesOf(list, 'div-as-sub')).toEqual([36])
    expect(list.map((c) => c.value)).not.toContain(7)
  })

  it('column errors drop carries and borrow the wrong way', () => {
    expect(columnNoCarry(275, 148)).toBe(313)
    expect(columnNoBorrow(342, 157)).toBe(215)
    expect(columnNoBorrow(2000, 725)).toBe(2725)
  })

  it('text choices include the answer once and keep misconceptions', () => {
    const choices = buildTextChoices('1/4', [{ value: '4/1', misconception: 'denominator-as-count' }, { value: '1/4' }, { value: '3/4' }], createRng('t'))
    expect(choices.map((c) => c.value).sort()).toEqual(['1/4', '3/4', '4/1'])
    expect(choices.find((c) => c.value === '4/1')?.misconception).toBe('denominator-as-count')
  })
})

describe('buildChoices with repeated candidate values', () => {
  it('keeps the specific misconception when it collides with an off-by-one', () => {
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`collision:${i}`)
      const choices = buildChoices(
        6,
        [
          { value: 7, misconception: 'order-of-operations' },
          { value: 7, misconception: 'off-by-one' },
          { value: 5, misconception: 'off-by-one' },
        ],
        rng,
        { min: 0, max: 100 },
      )
      expect(choices.find((c) => c.value === '7')?.misconception).toBe('order-of-operations')
      expect(new Set(choices.map((c) => c.value)).size).toBe(choices.length)
    }
  })
})
