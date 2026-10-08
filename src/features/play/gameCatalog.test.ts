import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { GAME_IDS } from '../../core/ambit/types'
import { buildMissionPlan } from '../daily-mission/missionPlan'
import { GAME_EMOJI } from './gameMeta'
import { GAME_REGISTRY } from './gameRegistry'
import { GAME_TITLES } from './gameTypes'

const NEW_GAMES = ['numero-amagat', 'pastis-fraccions', 'laberint-aventura'] as const

describe('game catalogue', () => {
  it('gives every game id a title, an emoji and a component', () => {
    for (const id of GAME_IDS) {
      expect(GAME_TITLES[id], id).toBeTruthy()
      expect(GAME_EMOJI[id], id).toBeTruthy()
      expect(GAME_REGISTRY[id], id).toBeDefined()
    }
  })

  it('registers the three new games', () => {
    for (const id of NEW_GAMES) expect(GAME_IDS).toContain(id)
  })

  it('only lists real game ids on the skills', () => {
    for (const skill of MATES_SKILLS) for (const game of skill.games) expect(GAME_IDS, `${skill.id}: ${game}`).toContain(game)
  })
})

describe('new games on the skills', () => {
  const games = (id: string): readonly string[] => MATES_SKILLS.find((s) => s.id === id)?.games ?? []

  it('El Número Amagat serves the missing-number skills', () => {
    expect(games('A10')).toContain('numero-amagat')
    expect(games('D9')).toContain('numero-amagat')
  })

  it('Pastís de Fraccions serves the fraction skills, equivalent fractions included', () => {
    for (const id of ['C8', 'D7', 'E9']) expect(games(id), id).toContain('pastis-fraccions')
  })

  it('the Laberint is never tied to a single skill: it is a region entry on the map', () => {
    for (const skill of MATES_SKILLS) expect(skill.games).not.toContain('laberint-aventura')
  })

  it('the daily mission can offer the new games when their skills are in play', () => {
    const states = { A10: { skillId: 'A10', status: 'aprenent', mastery: 0.5 } }
    const plan = buildMissionPlan(MATES_SKILLS, states as never, 0)
    const offered = plan.flatMap((step) => [step.gameId ?? '', ...step.options])
    expect(offered.every((g) => g === '' || (GAME_IDS as readonly string[]).includes(g))).toBe(true)
  })
})
