import { lazy } from 'react'
import { describe, expect, it } from 'vitest'
import { PLACES } from './registry'
import { isPlaceOpen } from './unlock'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { newSkillState } from '../../core/engine/mastery'
import { capitalised, sentenceName, STREET_ORDER, streetEntries } from './streetPlan'
import type { PlaceModule } from './types'

const Empty = lazy(async () => ({ default: () => null }))
const fake = (id: PlaceModule['id'], title: string): PlaceModule => ({ id, title, gameId: 'poble-botiga', skills: [], unlock: 'always', facade: 'facana-botiga', Component: Empty })

describe('streetEntries', () => {
  it('keeps the street order and marks the lots that are not built yet', () => {
    const entries = streetEntries([fake('botiga', 'La Botiga'), fake('casa', 'La Casa')])
    expect(entries.map((e) => e.id)).toEqual(STREET_ORDER)
    expect(entries[0]).toMatchObject({ id: 'casa', name: 'la Casa' })
    expect(entries[1]?.place?.id).toBe('botiga')
    expect(entries.find((e) => e.id === 'fleca')).toEqual({ id: 'fleca', name: 'la Fleca', place: undefined })
    expect(entries.find((e) => e.id === 'mercat')?.name).toBe('el Mercat')
  })
})

describe('names', () => {
  it.each([
    ['La Botiga', 'la Botiga'],
    ['L’Autobús', 'l’Autobús'],
    ["L'Autobús", 'l’Autobús'],
    ['Els Recreatius', 'els Recreatius'],
    ['la Perruqueria', 'la Perruqueria'],
    ['Sala de Jocs', 'Sala de Jocs'],
  ])('%s → %s', (title, name) => {
    expect(sentenceName(title)).toBe(name)
  })

  it('capitalises the start of a sentence', () => {
    expect(capitalised('l’Autobús')).toBe('L’Autobús')
  })
})

describe('Fleca and Pizzeria on the street', () => {
  const find = (id: string) => PLACES.find((p) => p.id === id)
  const mastered = (...ops: string[]) => Object.fromEntries(MATES_SKILLS.filter((s) => s.operation !== undefined && ops.includes(s.operation)).map((s) => [s.id, { ...newSkillState(s.id), status: 'dominada' as const, mastery: 0.95 }]))

  it('are built, with their own façade, unlock and game id', () => {
    expect(find('fleca')).toMatchObject({ title: 'la Fleca', gameId: 'poble-fleca', unlock: { operation: 'mul' } })
    expect(find('pizzeria')).toMatchObject({ title: 'la Pizzeria', gameId: 'poble-pizzeria', unlock: { operation: 'div' } })
    expect(typeof find('fleca')?.facade).toBe('function')
    expect(typeof find('pizzeria')?.facade).toBe('function')
    const entries = streetEntries(PLACES)
    expect(entries.find((e) => e.id === 'fleca')?.place).toBeDefined()
    expect(entries.find((e) => e.id === 'pizzeria')?.name).toBe('la Pizzeria')
  })

  it('stay behind scaffolding until their operation has started', () => {
    const fleca = find('fleca')
    const pizzeria = find('pizzeria')
    if (!fleca || !pizzeria) throw new Error('Falten llocs')
    expect(isPlaceOpen(fleca, { skillStates: {} })).toBe(false)
    expect(isPlaceOpen(pizzeria, { skillStates: {} })).toBe(false)
    const mul = { ...mastered('add', 'sub'), C4: { ...newSkillState('C4'), status: 'aprenent' as const } }
    expect(isPlaceOpen(fleca, { skillStates: mul })).toBe(true)
    expect(isPlaceOpen(pizzeria, { skillStates: mul })).toBe(false)
    const div = { ...mastered('add', 'sub', 'mul'), C7: { ...newSkillState('C7'), status: 'aprenent' as const } }
    expect(isPlaceOpen(pizzeria, { skillStates: div })).toBe(true)
  })

  it('serve only skills of their own operation or concept', () => {
    expect(find('fleca')?.skills).toEqual(['C3', 'C4', 'C5', 'C6', 'D2', 'D3', 'D5', 'E7'])
    expect(find('pizzeria')?.skills).toEqual(['C6', 'C7', 'C8', 'D4', 'D6', 'D7', 'E9'])
  })
})
