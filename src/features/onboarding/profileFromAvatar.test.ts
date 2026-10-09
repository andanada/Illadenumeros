import { describe, expect, it } from 'vitest'
import { CHARACTER_IDS, THEME_COLORS } from '../../core/storage/db'
import { PALETTE_COLORS } from '../../world/model/types'
import { profileFromAvatar } from './profileFromAvatar'

describe('profileFromAvatar', () => {
  it('the top colour picks the theme (old colour names) and her pet', () => {
    expect(profileFromAvatar({ top: { item: 'samarreta', color: 'rosa' } })).toEqual({ character: 'melo', color: 'rosa' })
    expect(profileFromAvatar({ top: { item: 'samarreta', color: 'cel' } })).toEqual({ character: 'blau', color: 'blau' })
    expect(profileFromAvatar({ top: { item: 'samarreta', color: 'carbo' } })).toEqual({ character: 'nyx', color: 'negre' })
  })

  it('every palette colour maps to a valid profile', () => {
    for (const color of PALETTE_COLORS) {
      const p = profileFromAvatar({ top: { item: 'samarreta', color } })
      expect(THEME_COLORS).toContain(p.color)
      expect(CHARACTER_IDS).toContain(p.character)
    }
  })
})
