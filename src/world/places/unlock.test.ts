import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { newSkillState, type SkillState, type SkillStatus } from '../../core/engine/mastery'
import { isPlaceOpen, unlockHint } from './unlock'

const state = (skillId: string, status: SkillStatus, mastery = 0.5): SkillState => ({ ...newSkillState(skillId), status, mastery })
const states = (...list: SkillState[]): Record<string, SkillState> => Object.fromEntries(list.map((s) => [s.skillId, s]))

/** Every fact skill of the operations given, mastered under the strict rule. */
const mastered = (...ops: string[]): SkillState[] => MATES_SKILLS.filter((s) => s.operation !== undefined && ops.includes(s.operation)).map((s) => state(s.id, 'dominada', 0.95))

describe('isPlaceOpen', () => {
  it("'always' is open from day one, even with no progress at all", () => {
    expect(isPlaceOpen({ unlock: 'always' }, { skillStates: {} })).toBe(true)
  })

  it('an operation opens once one of its skills has been started', () => {
    const place = { unlock: { operation: 'add' } } as const
    expect(isPlaceOpen(place, { skillStates: {} })).toBe(false)
    expect(isPlaceOpen(place, { skillStates: states(state('A4', 'nova', 0)) })).toBe(false)
    expect(isPlaceOpen(place, { skillStates: states(state('A4', 'aprenent')) })).toBe(true)
    // Started outside the operation (money, place value) does not count.
    expect(isPlaceOpen(place, { skillStates: states(state('A3', 'consolidant')) })).toBe(false)
  })

  it('a later operation needs the strict order: earlier ones mastered first', () => {
    const place = { unlock: { operation: 'mul' } } as const
    // Multiplication placed by the diagnostic, but addition is not mastered yet: still closed.
    expect(isPlaceOpen(place, { skillStates: states(state('C4', 'consolidant')) })).toBe(false)
    // Add and sub mastered, but nothing of mul started yet: closed.
    expect(isPlaceOpen(place, { skillStates: states(...mastered('add', 'sub')) })).toBe(false)
    expect(isPlaceOpen(place, { skillStates: states(...mastered('add', 'sub'), state('C4', 'aprenent')) })).toBe(true)
  })

  it('division waits for multiplication too', () => {
    const place = { unlock: { operation: 'div' } } as const
    expect(isPlaceOpen(place, { skillStates: states(...mastered('add', 'sub'), state('C7', 'aprenent')) })).toBe(false)
    expect(isPlaceOpen(place, { skillStates: states(...mastered('add', 'sub', 'mul'), state('C7', 'aprenent')) })).toBe(true)
  })

  it('the 5è market opens with the region of 5è (a 4t prerequisite reached)', () => {
    const place = { unlock: { grade: 5 } } as const
    expect(isPlaceOpen(place, { skillStates: {} })).toBe(false)
    expect(isPlaceOpen(place, { skillStates: states(state('D1', 'consolidant', 0.8), state('D7', 'consolidant', 0.8)) })).toBe(true)
    // Or any 5è skill already started (e.g. placed on another device).
    expect(isPlaceOpen(place, { skillStates: states(state('E1', 'aprenent')) })).toBe(true)
  })

  it('works with an explicit skill list (no skills of the operation = closed)', () => {
    expect(isPlaceOpen({ unlock: { operation: 'add' } }, { skillStates: states(state('A4', 'aprenent')) }, [])).toBe(false)
  })
})

describe('unlockHint (parents only)', () => {
  it('says plainly what opens each kind of place', () => {
    expect(unlockHint('always')).toBe('Obert des del primer dia')
    expect(unlockHint({ operation: 'add' })).toBe('S’obre quan comenci a treballar les sumes')
    expect(unlockHint({ operation: 'sub' })).toBe('S’obre quan domini les sumes i comenci les restes')
    expect(unlockHint({ operation: 'mul' })).toBe('S’obre quan domini les sumes i les restes i comenci les multiplicacions')
    expect(unlockHint({ operation: 'div' })).toBe('S’obre quan domini les sumes, les restes i les multiplicacions i comenci les divisions')
    expect(unlockHint({ grade: 5 })).toBe('S’obre amb els continguts de 5è')
    expect(unlockHint(undefined)).toBe('Encara en construcció')
  })
})
