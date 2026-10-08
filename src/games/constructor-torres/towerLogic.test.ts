import fc from 'fast-check'
import { blocksAfter, floorCaption, floorRows, floorsToBuild, isBuilt, questionLine, sumTape, towerPlan } from './towerLogic'

const mul = (a: number, b: number) => ({ kind: 'mul', a, b, product: a * b }) as const
const div = (q: number, d: number) => ({ kind: 'div', dividend: q * d, divisor: d, quotient: q }) as const

describe('towerLogic', () => {
  it('plans a tower for both operations', () => {
    expect(towerPlan(mul(3, 4))).toEqual({ kind: 'mul', size: 4, floors: 3, total: 12 })
    expect(towerPlan(div(3, 4))).toEqual({ kind: 'div', size: 4, floors: 3, total: 12 })
  })
  it('a finished tower holds exactly the total, never more', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), fc.integer({ min: 2, max: 10 }), fc.integer({ min: 0, max: 20 }), (a, b, extra) => {
        const plan = towerPlan(mul(a, b))
        expect(blocksAfter(plan, floorsToBuild(plan))).toBe(a * b)
        expect(blocksAfter(plan, a + extra)).toBe(a * b)
        expect(floorRows(plan, a + extra)).toHaveLength(a)
      }),
    )
  })
  it('knows when the tower is built', () => {
    const plan = towerPlan(mul(2, 5))
    expect([isBuilt(plan, 1), isBuilt(plan, 2)]).toEqual([false, true])
  })
  it('writes the repeated addition tape', () => {
    const plan = towerPlan(mul(3, 4))
    expect(sumTape(plan, 0, true)).toBe('Plantes de 4 blocs')
    expect(sumTape(plan, 3, true)).toBe('4 + 4 + 4 = 12')
    expect(sumTape(plan, 3, false)).toBe('4 + 4 + 4')
  })
  it('words captions and questions', () => {
    expect(floorCaption(towerPlan(mul(3, 4)), 0)).toBe('Construeix 3 plantes de 4 blocs')
    expect(floorCaption(towerPlan(div(3, 4)), 0)).toBe('Construeix la torre de 12 blocs amb plantes de 4')
    expect(floorCaption(towerPlan(mul(3, 4)), 1)).toBe('1 planta')
    expect(questionLine(towerPlan(div(3, 4)))).toBe('Quantes plantes de 4 blocs té la torre de 12?')
    expect(questionLine(towerPlan(mul(3, 4)))).toContain('3 plantes de 4')
  })
})
