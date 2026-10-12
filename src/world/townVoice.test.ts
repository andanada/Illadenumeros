import { describe, expect, it } from 'vitest'
import { clipKeyFor, normalizeSpeech } from '../core/audio/normalize'
import { jarMessage } from './hud/jarMessage'
import { CASA_CATALOG } from './places/casa/furniture/catalog'
import { WEARABLES } from './characters/wearables'
import { CHEER_LINE, CLOSED_PLACE_LINE, fixedTownLines, giftLines, giftMessage, JAR_MAX_MINUTES, jarLines, THANKS } from './townVoice'

describe('townVoice', () => {
  it('says what the gift is and where it goes: the wardrobe for clothes, the house for furniture', () => {
    expect(giftMessage({ name: 'Barret de sol', kind: 'accessory' })).toBe('Barret de sol! És per a tu. Ja és al teu armari.')
    expect(giftMessage({ name: 'Sofà', kind: 'furniture' })).toBe('Sofà! És per a tu. Ja és a casa teva.')
  })

  it('lists one jar line per whole number of minutes plus the two end states, each different', () => {
    const lines = jarLines()
    expect(lines).toHaveLength(JAR_MAX_MINUTES + 1)
    expect(new Set(lines).size).toBe(lines.length)
    expect(lines).toContain(jarMessage({ done: true, minutesLeft: 0 }))
    expect(lines).toContain(jarMessage({ done: false, minutesLeft: 7 }))
  })

  it('lists only the gifts the box can hold: priced clothes and furniture, never free starter pieces', () => {
    const lines = giftLines([...WEARABLES, ...CASA_CATALOG])
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.length).toBeLessThan(WEARABLES.length + CASA_CATALOG.length)
    const free = [...WEARABLES, ...CASA_CATALOG].find((e) => e.price === 0)
    expect(free).toBeDefined()
    expect(lines).not.toContain(giftMessage(free as NonNullable<typeof free>))
  })

  it('has fixed lines that are stable under normalisation (the key is the same for the raw and the normalised text)', () => {
    for (const line of fixedTownLines()) expect(clipKeyFor(line)).toBe(clipKeyFor(normalizeSpeech(line)))
    expect(fixedTownLines()).toEqual(expect.arrayContaining([...THANKS, CLOSED_PLACE_LINE, CHEER_LINE]))
  })
})
