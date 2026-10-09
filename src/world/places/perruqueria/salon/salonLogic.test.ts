import { describe, expect, it } from 'vitest'
import { NEIGHBOURS_BY_ID } from '../../../characters/neighbours'
import { applyTool, CLIP_ITEMS, HAIR_COLOURS, HAIR_STYLES, initialSalon, lookOf, nextSprayColour, reactionFor, toolKind, toolOfKind, TOOLS } from './salonLogic'

const start = initialSalon('cabell-curt', 'xocolata')

describe('salon free play', () => {
  it('scissors cycle the styles and wrap around', () => {
    let s = start
    for (let i = 0; i < HAIR_STYLES.length; i++) s = applyTool(s, 'tisores')
    expect(s.style).toBe('cabell-curt')
    expect(applyTool(start, 'tisores').style).toBe('cabell-bob')
  })

  it('the spray paints the colour it shows, never white', () => {
    const painted = applyTool(start, 'color')
    expect(painted.color).toBe(nextSprayColour(start))
    expect(HAIR_COLOURS).not.toContain('neu')
  })

  it('clips pin on one accessory after another, then take them off', () => {
    let s = start
    const seen: number[] = []
    for (let i = 0; i < CLIP_ITEMS.length + 1; i++) {
      s = applyTool(s, 'pinces')
      seen.push(s.clip)
    }
    expect(seen).toEqual([0, 1, 2, 3, -1])
  })

  it('the dryer fluffs and the next tool calms it; nothing mutates', () => {
    const frozen = Object.freeze({ ...start })
    expect(applyTool(frozen, 'assecador').fluffed).toBe(true)
    expect(applyTool(applyTool(frozen, 'assecador'), 'tisores').fluffed).toBe(false)
  })

  it('lookOf keeps the customer’s clothes and changes hair and clip', () => {
    const base = NEIGHBOURS_BY_ID['la-fatima']?.spec
    if (!base) throw new Error('sense veïna')
    const look = lookOf(base, applyTool(applyTool(start, 'color'), 'pinces'))
    expect(look.top).toEqual(base.top)
    expect(look.hair.color).toBe(nextSprayColour(start))
    expect(look.accessory?.item).toBe('flor')
    expect(lookOf(base, start).accessory).toEqual(base.accessory)
  })

  it('every tool has reactions and a stable kind', () => {
    for (const t of TOOLS) {
      expect(reactionFor(t, 0).length).toBeGreaterThan(0)
      expect(reactionFor(t, 5)).toBeTruthy()
      expect(toolOfKind(toolKind(t))).toBe(t)
    }
    expect(toolOfKind('altra')).toBeUndefined()
  })
})
