import fc from 'fast-check'
import { createRng } from '../../core/rng'
import { buildHerd, collectedMessage, glideFrames, herdCollected, multiplesIn, productChoices, sleepyMessage, tableAndTarget } from './dragonLogic'

const mul = (a: number, b: number) => ({ kind: 'mul', a, b, product: a * b }) as const
const div = (q: number, d: number) => ({ kind: 'div', dividend: q * d, divisor: d, quotient: q }) as const

describe('dragonLogic', () => {
  it('picks table and target for both operations', () => {
    expect(tableAndTarget(mul(3, 4))).toEqual({ table: 4, target: 12 })
    expect(tableAndTarget(div(3, 4))).toEqual({ table: 4, target: 12 })
  })

  it('builds herds with unique numbers, the target among the multiples and honest labels', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), fc.integer({ min: 2, max: 10 }), fc.constantFrom(1, 2, 3) as fc.Arbitrary<1 | 2 | 3>, fc.string(), (a, b, level, seed) => {
        const herd = buildHerd(mul(a, b), level, createRng(seed))
        const values = herd.dragons.map((d) => d.value)
        expect(new Set(values).size).toBe(values.length)
        expect(values).toContain(a * b)
        for (const d of herd.dragons) expect(d.belongs).toBe(d.value % b === 0)
        expect(multiplesIn(herd).length).toBe(level === 3 ? 4 : 3)
        expect(herd.dragons.length - multiplesIn(herd).length).toBe(3)
        expect(values.every((v) => v > 0)).toBe(true)
      }),
    )
  })

  it('is deterministic for a seed', () => {
    expect(buildHerd(mul(3, 4), 2, createRng('s'))).toEqual(buildHerd(mul(3, 4), 2, createRng('s')))
  })

  it('knows when the whole table is collected and offers only collected multiples as answers', () => {
    const herd = buildHerd(mul(3, 4), 1, createRng('x'))
    const all = multiplesIn(herd).map((d) => d.value)
    expect(herdCollected(herd, all.slice(1))).toBe(false)
    expect(herdCollected(herd, all)).toBe(true)
    const choices = productChoices(herd, all)
    expect(choices).toEqual([...all].sort((p, q) => p - q))
    expect(choices).toContain(12)
  })

  it('words kind messages', () => {
    expect(sleepyMessage(13, 4)).toBe('El 13 dorm: no és de la taula del 4. Mira el 12 i el 16.')
    expect(sleepyMessage(3, 4)).toBe('El 3 dorm: no és de la taula del 4.')
    expect(sleepyMessage(13, 4)).not.toMatch(/error|malament/i)
    expect(collectedMessage(8, 4)).toBe('8 és de la taula del 4!')
  })

  it('glides at a constant speed and loops', () => {
    const { left, times } = glideFrames(40)
    expect(left).toEqual(['40%', '-20%', '100%', '40%'])
    expect(times[0]).toBe(0)
    expect(times[3]).toBe(1)
    expect(times[1]).toBeCloseTo(0.5, 5)
    expect([...times].sort((p, q) => p - q)).toEqual(times)
  })
})
