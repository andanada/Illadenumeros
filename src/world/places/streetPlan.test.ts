import { lazy } from 'react'
import { describe, expect, it } from 'vitest'
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
