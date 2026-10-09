import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { newSkillState, type SkillState, type SkillStatus } from '../../core/engine/mastery'
import { MASTERY_THRESHOLDS } from '../../core/engine/thresholds'
import { BOARD_ERRANDS, buildBoard, daySeed, type BoardPlace } from './boardPlan'

const state = (skillId: string, status: SkillStatus, mastery = 0.5): SkillState => ({ ...newSkillState(skillId), status, mastery })
const states = (...list: SkillState[]): Record<string, SkillState> => Object.fromEntries(list.map((s) => [s.skillId, s]))
const ofOp = (op: string): string[] => MATES_SKILLS.filter((s) => s.operation === op).map((s) => s.id)

/** A beginner: some additions under way, nothing else. */
const BEGINNER = states(state('A1', 'dominada', 0.9), state('A2', 'dominada', 0.9), state('A3', 'consolidant', 0.7), state('A4', 'aprenent'), state('A5', 'aprenent'))

const BOTIGA: BoardPlace = { id: 'botiga', skills: [...ofOp('add'), ...ofOp('sub'), 'A3', 'B4', 'B5'] }
const CASA: BoardPlace = { id: 'casa', skills: ['A4', 'A5', 'A8'] }
const AUTOBUS: BoardPlace = { id: 'autobus', skills: ['A4', 'A6', 'A9', 'B1'] }
const PERRUQUERIA: BoardPlace = { id: 'perruqueria', skills: ['A5', 'A7'] }
const RECREATIUS: BoardPlace = { id: 'recreatius', skills: [...ofOp('add'), ...ofOp('sub')] }
const ALL = [CASA, BOTIGA, AUTOBUS, PERRUQUERIA, RECREATIUS]

const total = (plan: ReturnType<typeof buildBoard>): number => plan.tasks.reduce((n, t) => n + t.count, 0)

describe('buildBoard', () => {
  it('is the same all day long, and every lot is a place she can enter', () => {
    const a = buildBoard({ day: '2026-10-09', places: ALL, skills: MATES_SKILLS, states: BEGINNER })
    const b = buildBoard({ day: '2026-10-09', places: ALL, skills: MATES_SKILLS, states: BEGINNER })
    expect(a).toEqual(b)
    expect(a.day).toBe('2026-10-09')
    expect(total(a)).toBe(BOARD_ERRANDS)
    expect(a.tasks.every((t) => ALL.some((p) => p.id === t.place))).toBe(true)
    // One card per place.
    expect(new Set(a.tasks.map((t) => t.place)).size).toBe(a.tasks.length)
  })

  it('lasts about the minutes of the daily mission', () => {
    expect(BOARD_ERRANDS).toBeGreaterThanOrEqual(8)
    expect(BOARD_ERRANDS).toBeLessThanOrEqual(12)
  })

  it('starts with a warm-up at the Recreatius', () => {
    const plan = buildBoard({ day: '2026-10-09', places: ALL, skills: MATES_SKILLS, states: BEGINNER })
    expect(plan.tasks[0]).toMatchObject({ place: 'recreatius', kind: 'calentament', count: 1 })
  })

  it('at least half of the errands go to places that work the operation in progress', () => {
    for (const day of ['2026-10-09', '2026-10-10', '2026-12-31', '2027-03-01']) {
      const plan = buildBoard({ day, places: ALL, skills: MATES_SKILLS, states: BEGINNER })
      const core = plan.tasks.filter((t) => t.kind === 'repte').reduce((n, t) => n + t.count, 0)
      expect(core).toBeGreaterThanOrEqual(Math.ceil(BOARD_ERRANDS * MASTERY_THRESHOLDS.mission.coreShare))
    }
  })

  it('with addition mastered, subtraction is the challenge and additions come back as review', () => {
    const addDone = MATES_SKILLS.filter((s) => s.operation === 'add').map((s) => state(s.id, 'dominada', 0.95))
    const subPlace: BoardPlace = { id: 'autobus', skills: ofOp('sub') }
    const addPlace: BoardPlace = { id: 'perruqueria', skills: ofOp('add') }
    const plan = buildBoard({ day: '2026-10-09', places: [subPlace, addPlace], skills: MATES_SKILLS, states: states(...addDone, state('A6', 'aprenent')) })
    expect(plan.tasks.find((t) => t.place === 'autobus')).toMatchObject({ kind: 'repte' })
    expect(plan.tasks.find((t) => t.place === 'perruqueria')).toMatchObject({ kind: 'repas' })
    expect(total(plan)).toBe(BOARD_ERRANDS)
  })

  it('only the shop open: the whole board is at the shop', () => {
    const plan = buildBoard({ day: '2026-10-09', places: [BOTIGA], skills: MATES_SKILLS, states: BEGINNER })
    expect(plan.tasks).toHaveLength(1)
    expect(plan.tasks[0]).toMatchObject({ place: 'botiga', count: BOARD_ERRANDS })
  })

  it('places that serve nothing she can do still get errands rather than an empty board', () => {
    const plan = buildBoard({ day: '2026-10-09', places: [{ id: 'casa', skills: ['ZZ'] }], skills: MATES_SKILLS, states: {} })
    expect(plan.tasks).toEqual([expect.objectContaining({ place: 'casa', count: BOARD_ERRANDS })])
  })

  it('no open place: an empty board', () => {
    expect(buildBoard({ day: '2026-10-09', places: [], skills: MATES_SKILLS, states: BEGINNER }).tasks).toEqual([])
  })

  it('each card has a neighbour who asks', () => {
    const plan = buildBoard({ day: '2026-10-09', places: ALL, skills: MATES_SKILLS, states: BEGINNER })
    expect(plan.tasks.every((t) => t.neighbour.length > 0)).toBe(true)
    expect(plan.tasks.find((t) => t.place === 'botiga')?.neighbour ?? 'senyora-pilar').toBe('senyora-pilar')
  })
})

describe('daySeed', () => {
  it('is stable for a day and differs between days', () => {
    expect(daySeed('2026-10-09')).toBe(daySeed('2026-10-09'))
    expect(daySeed('2026-10-09')).not.toBe(daySeed('2026-10-10'))
    expect(daySeed('2026-10-09')).toBeGreaterThanOrEqual(0)
  })
})
