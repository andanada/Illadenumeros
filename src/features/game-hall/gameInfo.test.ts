import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { GAME_IDS } from '../../core/ambit/types'
import { newSkillState, type SkillState } from '../../core/engine/mastery'
import { buildHall, gameStars, GAME_GROUPS, groupOf, isGameUnlocked, pickSurprise, servedSkills } from './gameInfo'

const state = (skillId: string, status: SkillState['status'], mastery: number): SkillState => ({ ...newSkillState(skillId), status, mastery })
const ADD_DONE: Record<string, SkillState> = {
  A1: state('A1', 'dominada', 1),
  A3: state('A3', 'dominada', 1),
  A4: state('A4', 'dominada', 1),
  A5: state('A5', 'dominada', 1),
  A6: state('A6', 'aprenent', 0.7),
  A7: state('A7', 'dominada', 1),
  A8: state('A8', 'dominada', 1),
}

describe('groups', () => {
  it('places the known games by operation and any other game by its skills', () => {
    expect(groupOf('tren-sumes')).toBe('sumar')
    expect(groupOf('cursa-recta')).toBe('restar')
    expect(groupOf('fleca-files')).toBe('multiplicar')
    expect(groupOf('llaminadures')).toBe('dividir')
    expect(groupOf('escape-room')).toBe('pensar')
    expect(groupOf('joc-desconegut')).toBe('pensar')
  })

  it('every game id lands in one of the five groups', () => {
    const hall = buildHall(GAME_IDS, {})
    expect(hall.flatMap((s) => s.games).map((g) => g.id).sort()).toEqual([...GAME_IDS].sort())
    for (const section of hall) expect(GAME_GROUPS).toContain(section.group)
  })
})

describe('unlocking (strict order add -> sub -> mul -> div)', () => {
  it('a brand-new child only has the first games open', () => {
    expect(isGameUnlocked('repte-illa', {})).toBe(true)
    expect(isGameUnlocked('llaminadures', {})).toBe(false)
    expect(isGameUnlocked('fleca-files', {})).toBe(false)
    expect(isGameUnlocked('detectiu-errors', {})).toBe(false)
  })

  it('opens the games of an operation only after the earlier ones are mastered', () => {
    expect(isGameUnlocked('tren-sumes', ADD_DONE)).toBe(true)
    // Multiplication tables are still closed while subtraction is not mastered, even if the graph would allow it.
    const early = { ...ADD_DONE, C3: state('C3', 'dominada', 1) }
    expect(isGameUnlocked('llaminadures', early)).toBe(false)
  })

  it('a game serving several skills opens with any of them', () => {
    expect(servedSkills('detectiu-errors').length).toBeGreaterThan(3)
    expect(isGameUnlocked('detectiu-errors', ADD_DONE)).toBe(true)
  })
})

describe('stars and surprise', () => {
  it('shows the best level reached on the skills a game serves', () => {
    expect(gameStars('tren-sumes', {})).toBe(0)
    expect(gameStars('tren-sumes', { A4: state('A4', 'aprenent', 0.4) })).toBe(1)
    expect(gameStars('tren-sumes', ADD_DONE)).toBe(3)
  })

  it('the surprise is always an open game, deterministic for a given roll', () => {
    const hall = buildHall(GAME_IDS, ADD_DONE)
    const open = hall.flatMap((s) => s.games).filter((g) => g.unlocked).map((g) => g.id)
    expect(open.length).toBeGreaterThan(0)
    for (const roll of [0, 0.3, 0.77, 0.999]) expect(open).toContain(pickSurprise(hall, roll))
    expect(pickSurprise(hall, 0.5)).toBe(pickSurprise(hall, 0.5))
  })

  it('has no surprise when nothing is open', () => {
    expect(pickSurprise(buildHall(['llaminadures'], {}), 0.5)).toBeUndefined()
  })

  it('MATES_SKILLS still lists real skills for the extras', () => {
    const ids = new Set(MATES_SKILLS.map((s) => s.id))
    for (const game of ['laberint-aventura', 'detectiu-errors', 'contes-numeros', 'escape-room']) {
      expect(servedSkills(game).every((s) => ids.has(s.id))).toBe(true)
    }
  })
})
