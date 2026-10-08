import { describe, expect, it } from 'vitest'
import { factsForSkill } from '../../ambits/mates/facts'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { createRng } from '../rng'
import { newFactState, type FactState } from './leitner'
import { newSkillState, type SkillState } from './mastery'
import { focusSkill, selectNext, type SelectorInput } from './sessionSelector'

const NOW = 1_700_000_000_000

const placed = (id: string, mastery: number, status: SkillState['status']): SkillState => ({
  ...newSkillState(id), mastery, status, attempts: 10,
})

const input = (over: Partial<SelectorInput> = {}): SelectorInput => ({
  skills: MATES_SKILLS,
  skillStates: {},
  factStates: {},
  factsForSkill,
  recent: [],
  now: NOW,
  rng: createRng('t'),
  ...over,
})

describe('sessionSelector', () => {
  it('a brand-new child starts with the first skill of the graph', () => {
    const pick = selectNext(input())
    expect(pick.skillId).toBe('A1')
  })

  it('only picks skills that are unlocked or already placed', () => {
    const skillStates = { A1: placed('A1', 0.8, 'consolidant'), A3: placed('A3', 0.75, 'consolidant') }
    for (let i = 0; i < 50; i++) {
      const pick = selectNext(input({ skillStates, rng: createRng(`s${i}`) }))
      expect(['A1', 'A2', 'A3', 'A4', 'A5', 'B1']).toContain(pick.skillId)
    }
  })

  it('prefers due facts for review most of the time', () => {
    const skillStates = { A1: placed('A1', 0.9, 'dominada'), A3: placed('A3', 0.9, 'dominada'), A4: placed('A4', 0.7, 'consolidant') }
    const due: FactState = { ...newFactState('add:2+3', NOW - 1000), attempts: 3, correct: 3, box: 2, dueAt: NOW - 1000 }
    let reviews = 0
    for (let i = 0; i < 200; i++) {
      const pick = selectNext(input({ skillStates, factStates: { 'add:2+3': due }, recent: Array(8).fill(true), rng: createRng(`r${i}`) }))
      if (pick.mode === 'repas' && pick.factKey === 'add:2+3') reviews++
    }
    expect(reviews).toBeGreaterThan(110)
  })

  it('introduces nothing new when recent accuracy is below 70%', () => {
    const skillStates = { A1: placed('A1', 0.9, 'dominada'), A3: placed('A3', 0.62, 'consolidant') }
    const recent = [false, false, true, false, true, false, false, true]
    for (let i = 0; i < 100; i++) {
      expect(selectNext(input({ skillStates, recent, rng: createRng(`n${i}`) })).mode).not.toBe('nou')
    }
  })

  it('keeps at most 3 new facts "in flight" at the same time', () => {
    const skillStates = { A1: placed('A1', 0.9, 'dominada'), A3: placed('A3', 0.9, 'dominada'), A4: placed('A4', 0.5, 'aprenent') }
    const learning = factsForSkill('A4').slice(0, 3)
    const factStates = Object.fromEntries(learning.map((k) => [k, { ...newFactState(k, NOW + 99999), attempts: 1, box: 1 }]))
    for (let i = 0; i < 100; i++) {
      const pick = selectNext(input({ skillStates, factStates, recent: Array(8).fill(true), restrictTo: ['A4'], rng: createRng(`f${i}`) }))
      expect(learning).toContain(pick.factKey)
    }
  })

  it('respects the skills allowed by the current game', () => {
    const skillStates = { A1: placed('A1', 0.9, 'dominada'), A3: placed('A3', 0.9, 'dominada') }
    const pick = selectNext(input({ skillStates, restrictTo: ['A5'] }))
    expect(pick.skillId).toBe('A5')
  })

  it('when a game asks only for locked skills it still serves them instead of an unrelated skill', () => {
    const pick = selectNext(input({ restrictTo: ['B5'] }))
    expect(pick.skillId).toBe('B5')
  })

  it('the focus skill is the earliest one still being learned', () => {
    const skillStates = { A1: placed('A1', 0.9, 'dominada'), A3: placed('A3', 0.62, 'consolidant'), A2: placed('A2', 0.3, 'aprenent') }
    expect(focusSkill(MATES_SKILLS, skillStates)).toBe('A2')
  })
})

describe('review of mastered skills', () => {
  it('does not spend most of the time on mastered content while something is being learned', () => {
    const skillStates = {
      A1: placed('A1', 0.95, 'dominada'),
      A3: placed('A3', 0.95, 'dominada'),
      A4: placed('A4', 0.5, 'aprenent'),
    }
    let mastered = 0
    for (let i = 0; i < 300; i++) {
      const pick = selectNext(input({ skillStates, recent: Array(8).fill(true), rng: createRng(`m${i}`) }))
      if (pick.skillId === 'A1' || pick.skillId === 'A3') mastered++
    }
    expect(mastered).toBeLessThan(110)
  })
})

describe('core operation emphasis, strict order and interleaving', () => {
  const states = (over: Record<string, SkillState> = {}): Record<string, SkillState> => ({
    A1: placed('A1', 0.95, 'dominada'),
    A2: placed('A2', 0.8, 'consolidant'),
    A3: placed('A3', 0.95, 'dominada'),
    A4: placed('A4', 0.7, 'consolidant'),
    B1: placed('B1', 0.8, 'consolidant'),
    ...over,
  })
  const seenFact = (key: string, box: number, over: Partial<FactState> = {}): FactState => ({ ...newFactState(key, NOW), attempts: 6, correct: 6, box, streak: 3, dueAt: NOW + 5 * 86_400_000, ...over })
  const ops = (id: string): string | undefined => MATES_SKILLS.find((s) => s.id === id)?.operation
  const good = Array(10).fill(true)

  it('sends at least half of the questions to the operation in progress', () => {
    let core = 0
    const n = 400
    for (let i = 0; i < n; i++) {
      const pick = selectNext(input({ skillStates: states(), recent: good, rng: createRng(`core${i}`) }))
      if (ops(pick.skillId) === 'add') core++
    }
    expect(core / n).toBeGreaterThanOrEqual(0.5)
  })

  it('does not introduce subtraction, multiplication or division facts while addition is not mastered', () => {
    const open = states({ A5: placed('A5', 0.9, 'consolidant'), A7: placed('A7', 0.9, 'consolidant'), A8: placed('A8', 0.9, 'consolidant'), B5: placed('B5', 0.9, 'dominada'), B4: placed('B4', 0.9, 'dominada'), C3: placed('C3', 0.9, 'dominada') })
    for (let i = 0; i < 300; i++) {
      const pick = selectNext(input({ skillStates: open, recent: good, rng: createRng(`ord${i}`) }))
      expect(['sub', 'mul', 'div']).not.toContain(ops(pick.skillId))
    }
  })

  it('never introduces an unseen division fact before multiplication is mastered (even in a started division skill)', () => {
    const mul = ['C4', 'C5', 'D2'].map((id) => placed(id, 0.95, 'dominada'))
    const add = ['A4', 'A5', 'A7', 'A8', 'A6', 'A9'].map((id) => placed(id, 0.95, 'dominada'))
    const skillStates = Object.fromEntries([...add, ...mul, placed('D3', 0.8, 'consolidant'), placed('C7', 0.7, 'consolidant'), placed('C6', 0.9, 'dominada')].map((s) => [s.skillId, s]))
    const seen = factsForSkill('C7').slice(0, 4)
    const factStates = Object.fromEntries(seen.map((k) => [k, seenFact(k, 1)]))
    for (let i = 0; i < 300; i++) {
      const pick = selectNext(input({ skillStates, factStates, recent: good, rng: createRng(`div${i}`) }))
      if (ops(pick.skillId) === 'div' && pick.factKey !== undefined) expect(seen).toContain(pick.factKey)
    }
  })

  it('mixes operations in review: with due facts of two operations it avoids repeating the last operation', () => {
    // Everything mastered: no operation is "in progress", so this is pure review.
    const skillStates = Object.fromEntries(MATES_SKILLS.filter((x) => x.operation).map((x) => [x.id, placed(x.id, 0.95, 'dominada')]))
    const dueAdd = seenFact('add:2+3', 2, { dueAt: NOW - 5000 })
    const dueAdd2 = seenFact('add:2+4', 2, { dueAt: NOW - 4000 })
    const dueSub = seenFact('sub:5-2', 2, { dueAt: NOW - 1000 })
    let sub = 0
    for (let i = 0; i < 100; i++) {
      const pick = selectNext(input({ skillStates, factStates: { 'add:2+3': dueAdd, 'add:2+4': dueAdd2, 'sub:5-2': dueSub }, recent: good, history: [{ skillId: 'A4', factKey: 'add:2+3' }], restrictTo: ['A4', 'A6'], rng: createRng(`mix${i}`) }))
      if (pick.mode === 'repas' && pick.factKey === 'sub:5-2') sub++
    }
    expect(sub).toBeGreaterThan(90)
  })

  it('never repeats the previous fact back-to-back when another is available', () => {
    const f1 = seenFact('add:2+3', 2, { dueAt: NOW - 5000 })
    const f2 = seenFact('add:2+4', 2, { dueAt: NOW - 1000 })
    for (let i = 0; i < 60; i++) {
      const pick = selectNext(input({ skillStates: states(), factStates: { 'add:2+3': f1, 'add:2+4': f2 }, recent: good, history: [{ skillId: 'A4', factKey: 'add:2+3' }], restrictTo: ['A4'], rng: createRng(`bb${i}`) }))
      expect(pick.factKey).not.toBe('add:2+3')
    }
  })

  it('warm-up only asks facts already in box 2 or higher', () => {
    const keys = factsForSkill('A4')
    const factStates = Object.fromEntries(keys.slice(0, 6).map((k, i) => [k, seenFact(k, i < 3 ? 1 : 3)]))
    for (let i = 0; i < 80; i++) {
      const pick = selectNext(input({ skillStates: states(), factStates, recent: good, minBox: 2, restrictTo: ['A4'], rng: createRng(`w${i}`) }))
      expect(pick.factKey && (factStates[pick.factKey]?.box ?? 0)).toBeGreaterThanOrEqual(2)
    }
  })

  it('counts facts in flight across skills: with 3 being learned nothing new is introduced', () => {
    const learning = [...factsForSkill('A4').slice(0, 2), ...factsForSkill('A5').slice(0, 1)]
    const factStates = Object.fromEntries(learning.map((k) => [k, seenFact(k, 1, { streak: 1 })]))
    const skillStates = states({ A5: placed('A5', 0.6, 'aprenent') })
    for (let i = 0; i < 200; i++) {
      const pick = selectNext(input({ skillStates, factStates, recent: good, rng: createRng(`fl${i}`) }))
      if (pick.factKey !== undefined && ops(pick.skillId) !== undefined) expect(factStates[pick.factKey]?.attempts ?? 0).toBeGreaterThan(0)
    }
  })
})
