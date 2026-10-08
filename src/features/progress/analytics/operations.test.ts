import { describe, expect, it } from 'vitest'
import { factsForSkill } from '../../../ambits/mates/facts'
import { MATES_SKILLS } from '../../../ambits/mates/skills'
import { newFactState, type FactState } from '../../../core/engine/leitner'
import { newSkillState, type SkillState } from '../../../core/engine/mastery'
import { buildOperationSummaries, operationWaitingNote } from './operations'

const done = (id: string): SkillState => ({ ...newSkillState(id), status: 'dominada', mastery: 0.95, attempts: 60 })
const fact = (key: string, box: number, rt = 1500): FactState => ({ ...newFactState(key, 0), attempts: 6, box, recentRts: [rt, rt, rt] })
const addKeys = ['A4', 'A5', 'A7', 'A8'].flatMap(factsForSkill)

describe('buildOperationSummaries', () => {
  it('lists the four operations in order with their totals', () => {
    const ops = buildOperationSummaries(MATES_SKILLS, {}, {})
    expect(ops.map((o) => o.id)).toEqual(['add', 'sub', 'mul', 'div'])
    expect(ops[0]?.total).toBe(addKeys.length)
    expect(ops.every((o) => o.automatised === 0 && o.inReview === 0 && o.unseen === o.total)).toBe(true)
  })

  it('counts automatised facts (box 4+ and within the strict time) and facts in review', () => {
    const facts: Record<string, FactState> = {}
    addKeys.slice(0, 10).forEach((k) => (facts[k] = fact(k, 5)))
    addKeys.slice(10, 14).forEach((k) => (facts[k] = fact(k, 2)))
    addKeys.slice(14, 16).forEach((k) => (facts[k] = fact(k, 5, 3800)))
    const add = buildOperationSummaries(MATES_SKILLS, {}, facts)[0]
    expect(add).toMatchObject({ automatised: 10, inReview: 6, unseen: addKeys.length - 16 })
    expect(add?.headline).toBe(`Sumes: 10 de ${addKeys.length} automatitzades`)
  })

  it('marks the first unmastered operation as in progress and the later ones as waiting', () => {
    const ops = buildOperationSummaries(MATES_SKILLS, {}, {})
    expect(ops.map((o) => o.state)).toEqual(['en-curs', 'esperant', 'esperant', 'esperant'])
  })

  it('an operation is "dominada" only when all its skills are', () => {
    const states = Object.fromEntries(['A4', 'A5', 'A7', 'A8'].map((id) => [id, done(id)]))
    const ops = buildOperationSummaries(MATES_SKILLS, states, {})
    expect(ops.map((o) => o.state)).toEqual(['dominada', 'en-curs', 'esperant', 'esperant'])
  })

  it('says honestly why an operation is waiting, without promising a date', () => {
    const ops = buildOperationSummaries(MATES_SKILLS, {}, {})
    expect(operationWaitingNote(ops[1] as never, ops[0] as never)).toBe('Les restes s’obriran quan les sumes estiguin al 90 %.')
    expect(operationWaitingNote(ops[2] as never, ops[1] as never)).toBe('Les multiplicacions s’obriran quan les restes estiguin al 90 %.')
    expect(operationWaitingNote(ops[3] as never, ops[2] as never)).toBe('Les divisions s’obriran quan les multiplicacions estiguin al 90 %.')
    for (const o of ops) expect(o.note).not.toMatch(/dies|setmanes|mesos|aviat/i)
  })
})
