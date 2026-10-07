import { describe, expect, it } from 'vitest'
import { validateGraph } from '../../core/engine/graph'
import { DIAGNOSTIC_ANCHORS, MATES_SKILLS } from './skills'

const byId = new Map(MATES_SKILLS.map((s) => [s.id, s]))

const EXPECTED: Record<string, { prereqs: string[]; hasFacts: boolean; grade: number }> = {
  C1: { prereqs: ['B1'], hasFacts: false, grade: 3 },
  C2: { prereqs: ['B7', 'C1'], hasFacts: false, grade: 3 },
  C3: { prereqs: ['B5'], hasFacts: false, grade: 3 },
  C4: { prereqs: ['C3'], hasFacts: true, grade: 3 },
  C5: { prereqs: ['C4'], hasFacts: true, grade: 3 },
  C6: { prereqs: ['C3'], hasFacts: false, grade: 3 },
  C7: { prereqs: ['C4', 'C6'], hasFacts: true, grade: 3 },
  C8: { prereqs: ['C6'], hasFacts: false, grade: 3 },
  C9: { prereqs: ['B7', 'C2'], hasFacts: false, grade: 3 },
  C10: { prereqs: ['C3', 'C2'], hasFacts: false, grade: 3 },
  D1: { prereqs: ['C1'], hasFacts: false, grade: 4 },
  D2: { prereqs: ['C5'], hasFacts: true, grade: 4 },
  D3: { prereqs: ['D2'], hasFacts: true, grade: 4 },
  D4: { prereqs: ['D3', 'C7'], hasFacts: true, grade: 4 },
  D5: { prereqs: ['D2', 'C1'], hasFacts: false, grade: 4 },
  D6: { prereqs: ['D4'], hasFacts: false, grade: 4 },
  D7: { prereqs: ['C8'], hasFacts: false, grade: 4 },
  D8: { prereqs: ['D1'], hasFacts: false, grade: 4 },
  D9: { prereqs: ['A10', 'D4'], hasFacts: false, grade: 4 },
}

describe('3r and 4t skill graph', () => {
  it('keeps the whole graph valid', () => {
    expect(() => validateGraph(MATES_SKILLS)).not.toThrow()
  })

  it.each(Object.keys(EXPECTED))('%s has the briefed grade, prerequisites and fact flag', (id) => {
    const skill = byId.get(id)
    const expected = EXPECTED[id]
    expect(skill, id).toBeDefined()
    expect(skill?.grade).toBe(expected?.grade)
    expect([...(skill?.prereqs ?? [])].sort()).toEqual([...(expected?.prereqs ?? [])].sort())
    expect(skill?.hasFacts).toBe(expected?.hasFacts)
  })

  it('fact skills target 4 s and step skills 6–9 s', () => {
    for (const id of Object.keys(EXPECTED)) {
      const skill = byId.get(id)
      if (skill?.hasFacts) expect(skill.fluencyTargetMs, id).toBe(4000)
      else {
        expect(skill?.fluencyTargetMs, id).toBeGreaterThanOrEqual(6000)
        expect(skill?.fluencyTargetMs, id).toBeLessThanOrEqual(9000)
      }
    }
  })

  it('uses the new games where they fit', () => {
    expect(byId.get('C4')?.games).toContain('fleca-files')
    expect(byId.get('C4')?.games).toContain('duel-llampec')
    expect(byId.get('C6')?.games).toContain('llaminadures')
    expect(byId.get('C9')?.games).toContain('botiga-pluja')
  })

  it('placement chain starts at A4 and climbs to 4t', () => {
    expect([...DIAGNOSTIC_ANCHORS]).toEqual(['A4', 'A5', 'A8', 'A9', 'B5', 'B7', 'C3', 'C4', 'D2'])
  })

  it('every anchor is a real skill and the chain follows the grade order', () => {
    const grades = DIAGNOSTIC_ANCHORS.map((id) => byId.get(id)?.grade ?? 0)
    expect(grades.every((g) => g > 0)).toBe(true)
    expect([...grades].sort((a, b) => a - b)).toEqual(grades)
  })
})
