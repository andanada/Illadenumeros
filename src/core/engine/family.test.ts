import { describe, expect, it } from 'vitest'
import { factFamily } from '../../ambits/mates/factFamilies'
import { factOwner } from '../../ambits/mates/operations'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { createRng } from '../rng'
import { isFollowUpStillValid, planFamilyPartners, type FamilyInput } from './family'
import { newFactState, type FactState } from './leitner'
import { newSkillState, type SkillState } from './mastery'

const NOW = 1_800_000_000_000
const skill = (id: string, status: SkillState['status'], mastery = 0.7): SkillState => ({ ...newSkillState(id), status, mastery, attempts: 30 })
const seen = (key: string, box = 2): FactState => ({ ...newFactState(key, NOW), attempts: 4, correct: 4, box, streak: 3 })

const base = (over: Partial<FamilyInput> = {}): FamilyInput => ({
  factKey: 'add:5+8',
  familyOf: factFamily,
  ownerOf: factOwner,
  skills: MATES_SKILLS,
  skillStates: { A4: skill('A4', 'dominada'), A5: skill('A5', 'dominada'), A6: skill('A6', 'dominada'), A7: skill('A7', 'dominada'), A8: skill('A8', 'dominada'), A9: skill('A9', 'aprenent') },
  factStates: {},
  recent: [true, true, true, true],
  counter: 10,
  queued: [],
  rng: createRng('fam'),
  ...over,
})

describe('planFamilyPartners', () => {
  it('queues seen partners a few questions later, never back-to-back', () => {
    const plan = planFamilyPartners(base({ factStates: { 'sub:13-5': seen('sub:13-5'), 'sub:13-8': seen('sub:13-8') } }))
    expect(plan.map((p) => p.selection.factKey).sort()).toEqual(['sub:13-5', 'sub:13-8'])
    for (const p of plan) {
      expect(p.afterN - 10).toBeGreaterThanOrEqual(2)
      expect(p.afterN - 10).toBeLessThanOrEqual(4)
      expect(p.selection.skillId).toBe('A9')
    }
    expect(new Set(plan.map((p) => p.afterN)).size).toBe(plan.length)
  })

  it('does not queue a partner already queued, nor more than two', () => {
    const queued = [{ afterN: 12, selection: { skillId: 'A9', factKey: 'sub:13-5', mode: 'repas' as const } }]
    const plan = planFamilyPartners(base({ queued, factStates: { 'sub:13-5': seen('sub:13-5'), 'sub:13-8': seen('sub:13-8') } }))
    expect(plan.map((p) => p.selection.factKey)).toEqual(['sub:13-8'])
  })

  it('does not introduce unseen partners when accuracy is low', () => {
    const plan = planFamilyPartners(base({ recent: [false, false, true, false, false, true, false, true] }))
    expect(plan).toEqual([])
  })

  it('introduces unseen partners only below the limit of 3 facts in flight', () => {
    const inFlight = Object.fromEntries(['add:2+3', 'add:2+4', 'add:3+4'].map((k) => [k, { ...seen(k, 1), streak: 1 }]))
    expect(planFamilyPartners(base({ factStates: inFlight }))).toEqual([])
    expect(planFamilyPartners(base()).length).toBeGreaterThan(0)
  })

  it('respects the games skill filter', () => {
    expect(planFamilyPartners(base({ restrictTo: ['A8'], factStates: { 'sub:13-5': seen('sub:13-5') } }))).toEqual([])
  })

  it('never queues a partner of an operation that is not introduced yet, unless already seen', () => {
    const early = base({ skillStates: { A4: skill('A4', 'consolidant'), A8: skill('A8', 'consolidant'), A6: skill('A6', 'consolidant'), A9: skill('A9', 'aprenent') } })
    expect(planFamilyPartners(early)).toEqual([])
    const withSeen = base({ ...early, factStates: { 'sub:13-5': seen('sub:13-5') } })
    expect(planFamilyPartners(withSeen).map((p) => p.selection.factKey)).toEqual(['sub:13-5'])
  })

  it('plans nothing for a mature fact (box 4+): its partners come back on their own schedule', () => {
    const plan = planFamilyPartners(base({ factStates: { 'add:5+8': seen('add:5+8', 4), 'sub:13-5': seen('sub:13-5', 2) }, shownOrder: 'asc' }))
    expect(plan).toEqual([])
  })

  it('skips a mature partner that is not due yet, but keeps one that is', () => {
    const matureLater = seen('sub:13-5', 5)
    const dueNow = { ...seen('sub:13-8', 5), dueAt: NOW - 1 }
    const plan = planFamilyPartners(base({ now: NOW, factStates: { 'add:5+8': seen('add:5+8', 2), 'sub:13-5': { ...matureLater, dueAt: NOW + 86_400_000 }, 'sub:13-8': dueNow } }))
    expect(plan.map((p) => p.selection.factKey)).toEqual(['sub:13-8'])
  })

  it('asks the commutative twin in the other order', () => {
    const plan = planFamilyPartners(base({ factKey: 'add:5+8', shownOrder: 'asc', factStates: {} }))
    const twin = plan.find((p) => p.selection.factKey === 'add:5+8')
    expect(twin?.selection.order).toBe('desc')
  })
})

describe('isFollowUpStillValid', () => {
  const unseen = { afterN: 3, selection: { skillId: 'A9', factKey: 'sub:13-5', mode: 'repas' as const } }
  const flight = Object.fromEntries(['add:2+3', 'add:2+4', 'add:3+4'].map((k) => [k, { ...seen(k, 1), streak: 1 }]))
  const ctx = (factStates: Record<string, FactState>) => ({ skills: MATES_SKILLS, factStates, factsForSkill: (id: string) => (id === 'A4' ? ['add:2+3', 'add:2+4', 'add:3+4'] : id === 'A9' ? ['sub:13-5'] : []) })

  it('drops a planned unseen fact when 3 others are in flight by the time it is due', () => {
    expect(isFollowUpStillValid(unseen, ctx(flight))).toBe(false)
    expect(isFollowUpStillValid(unseen, ctx({}))).toBe(true)
  })

  it('always keeps seen facts', () => {
    expect(isFollowUpStillValid(unseen, ctx({ ...flight, 'sub:13-5': seen('sub:13-5') }))).toBe(true)
  })
})
