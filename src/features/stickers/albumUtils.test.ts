import { STICKERS } from './catalog'
import { stableTilt } from './albumUtils'

describe('stableTilt', () => {
  it('is deterministic', () => {
    expect(stableTilt('maduixa')).toBe(stableTilt('maduixa'))
  })
  it('stays within -7..7 and never flat for the whole catalog', () => {
    for (const s of STICKERS) {
      const t = stableTilt(s.id)
      expect(Math.abs(t)).toBeLessThanOrEqual(7)
      expect(t).not.toBe(0)
    }
  })
  it('varies between stickers', () => {
    expect(new Set(STICKERS.map((s) => stableTilt(s.id))).size).toBeGreaterThan(4)
  })
})
