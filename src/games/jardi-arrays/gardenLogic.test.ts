import fc from 'fast-check'
import { buttonLabel, gardenCaption, gardenCols, gardenPlan, hasFlower, plantedCount, questionLine, rowsWithFlowers, stepsNeeded } from './gardenLogic'

const mul = (a: number, b: number) => ({ kind: 'mul', a, b, product: a * b }) as const
const div = (q: number, d: number) => ({ kind: 'div', dividend: q * d, divisor: d, quotient: q }) as const

describe('gardenLogic', () => {
  it('plans both operations', () => {
    expect(gardenPlan(mul(3, 4))).toEqual({ mode: 'area', rows: 3, cols: 4 })
    expect(gardenPlan(div(4, 3))).toEqual({ mode: 'share', rows: 3, total: 12 })
  })
  it('planting every step ends with the whole garden', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), fc.integer({ min: 2, max: 10 }), (x, y) => {
        const m = gardenPlan(mul(x, y))
        expect(plantedCount(m, stepsNeeded(m))).toBe(x * y)
        const d = gardenPlan(div(x, y))
        expect(plantedCount(d, stepsNeeded(d))).toBe(x * y)
        expect(gardenCols(d)).toBe(x)
      }),
    )
  })
  it('counts flowers cell by cell like the total', () => {
    const plan = gardenPlan(div(3, 2))
    for (let step = 0; step <= 3; step++) {
      let n = 0
      for (let r = 0; r < plan.rows; r++) for (let c = 0; c < gardenCols(plan); c++) if (hasFlower(plan, step, r, c)) n += 1
      expect(n).toBe(plantedCount(plan, step))
    }
  })
  it('rows with flowers', () => {
    expect(rowsWithFlowers(gardenPlan(mul(3, 4)), 2)).toBe(2)
    expect(rowsWithFlowers(gardenPlan(div(4, 3)), 0)).toBe(0)
    expect(rowsWithFlowers(gardenPlan(div(4, 3)), 1)).toBe(3)
  })
  it('words captions, hiding the running total on request', () => {
    const plan = gardenPlan(mul(3, 4))
    expect(gardenCaption(plan, 0, true)).toBe('Planta 3 files de 4 flors')
    expect(gardenCaption(plan, 2, true)).toBe('2 files de 4 = 8 flors')
    expect(gardenCaption(plan, 2, false)).toBe('2 files de 4')
    expect(gardenCaption(gardenPlan(div(4, 3)), 1, true)).toBe('1 flor a cada fila: 3 de 12 flors')
    expect(buttonLabel(plan)).toBe('Planta una fila')
    expect(questionLine(div(4, 3))).toBe('Quantes flors té cada fila?')
    expect(questionLine(mul(3, 4))).toContain('3 files de 4')
  })
})
