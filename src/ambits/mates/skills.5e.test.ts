import { describe, expect, it } from 'vitest'
import { ancestorsOf, validateGraph } from '../../core/engine/graph'
import { MATES_SKILLS } from './skills'

const byId = new Map(MATES_SKILLS.map((s) => [s.id, s]))

const EXPECTED: Record<string, { prereqs: string[]; hasFacts: boolean }> = {
  E1: { prereqs: ['D1', 'D7'], hasFacts: false },
  E2: { prereqs: ['E1'], hasFacts: false },
  E3: { prereqs: ['E2', 'C2'], hasFacts: false },
  E4: { prereqs: ['D5'], hasFacts: false },
  E5: { prereqs: ['D6', 'E1'], hasFacts: false },
  E6: { prereqs: ['D5', 'C10'], hasFacts: false },
  E7: { prereqs: ['E4'], hasFacts: false },
  E8: { prereqs: ['D4'], hasFacts: false },
  E9: { prereqs: ['D7', 'E8'], hasFacts: false },
  E10: { prereqs: ['E3', 'E9', 'C9'], hasFacts: false },
}

describe('5è skill graph (Ciutat dels Decimals)', () => {
  it('keeps the whole graph acyclic and valid', () => {
    expect(() => validateGraph(MATES_SKILLS)).not.toThrow()
  })

  it('has exactly E1..E10, all of grade 5', () => {
    const grade5 = MATES_SKILLS.filter((s) => s.grade === 5).map((s) => s.id)
    expect(grade5).toEqual(Object.keys(EXPECTED))
  })

  it.each(Object.keys(EXPECTED))('%s has the briefed prerequisites', (id) => {
    expect([...(byId.get(id)?.prereqs ?? [])].sort()).toEqual([...(EXPECTED[id]?.prereqs ?? [])].sort())
    expect(byId.get(id)?.hasFacts).toBe(false)
  })

  it('every E skill depends (transitively) on 4t content', () => {
    for (const id of Object.keys(EXPECTED)) {
      const ancestors = ancestorsOf(MATES_SKILLS, id)
      expect([...ancestors].some((a) => byId.get(a)?.grade === 4), id).toBe(true)
    }
  })

  it('uses only known games and puts E10 in the shop', () => {
    expect(byId.get('E10')?.games).toContain('botiga-pluja')
    expect(byId.get('E7')?.games).toContain('fleca-files')
  })

  it('step targets are between 6 and 9 s', () => {
    for (const id of Object.keys(EXPECTED)) {
      expect(byId.get(id)?.fluencyTargetMs).toBeGreaterThanOrEqual(6000)
      expect(byId.get(id)?.fluencyTargetMs).toBeLessThanOrEqual(9000)
    }
  })
})
