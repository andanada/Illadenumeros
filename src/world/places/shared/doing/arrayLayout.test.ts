import { describe, expect, it } from 'vitest'
import { arrayLayout, groupLayouts, pieceRect } from './arrayLayout'

const IPAD = { w: 1024, h: 600 }
const PHONE = { w: 390, h: 520 }

describe('arrayLayout', () => {
  it('lays rows x cols out as a frame with exactly that many slots', () => {
    const l = arrayLayout({ rows: 3, cols: 6, extraRows: 0 }, IPAD, 0.46)
    expect(l.cols).toBe(6)
    expect(l.capacity).toBe(18)
    expect(l.rect.w).toBeGreaterThan(0)
    expect(l.rect.x + l.rect.w).toBeLessThanOrEqual(1)
    expect(l.rect.y).toBeGreaterThan(0.46)
    expect(l.rect.y + l.rect.h).toBeLessThanOrEqual(0.97)
  })

  it('adds spare rows without giving the answer away', () => {
    const l = arrayLayout({ rows: 3, cols: 6, extraRows: 2 }, IPAD, 0.46)
    expect(l.capacity).toBe(30)
  })

  it('never exceeds ten rows and keeps cells readable on a phone', () => {
    const l = arrayLayout({ rows: 9, cols: 6, extraRows: 3 }, PHONE, 0.46)
    expect(l.capacity).toBe(60)
    expect(l.cellPx).toBeGreaterThanOrEqual(26)
    expect(l.rect.x).toBeGreaterThanOrEqual(0)
    expect(l.rect.x + l.rect.w).toBeLessThanOrEqual(1)
  })

  it('is deterministic', () => {
    expect(arrayLayout({ rows: 4, cols: 5, extraRows: 0 }, IPAD, 0.46)).toEqual(arrayLayout({ rows: 4, cols: 5, extraRows: 0 }, IPAD, 0.46))
  })
})

describe('groupLayouts', () => {
  it('places N groups side by side inside the stage', () => {
    const g = groupLayouts(3, 4, IPAD, 0.46)
    expect(g).toHaveLength(3)
    g.forEach((l) => {
      expect(l.capacity).toBe(4)
      expect(l.rect.x).toBeGreaterThanOrEqual(0)
      expect(l.rect.x + l.rect.w).toBeLessThanOrEqual(1)
    })
    expect(g[0]!.rect.x).toBeLessThan(g[1]!.rect.x)
    expect(g[0]!.rect.x + g[0]!.rect.w).toBeLessThanOrEqual(g[1]!.rect.x)
  })

  it('wraps to two rows when there are many groups', () => {
    const g = groupLayouts(8, 3, PHONE, 0.46)
    expect(new Set(g.map((l) => l.rect.y)).size).toBe(2)
  })
})

describe('pieceRect', () => {
  it('covers a part of a piece in fractions of the stage', () => {
    const r = pieceRect({ x: 0.5, y: 0.5, h: 0.4, ratio: 1 }, { fx: 0, fy: 0, fw: 1, fh: 1 }, { w: 1000, h: 500 })
    expect(r.h).toBeCloseTo(0.4)
    expect(r.x + r.w / 2).toBeCloseTo(0.5)
    expect(r.y + r.h).toBeCloseTo(0.5)
  })
  it('shrinks with the stage unit on a tall phone, not with its height', () => {
    const phone = pieceRect({ x: 0.5, y: 0.5, h: 0.4, ratio: 1 }, { fx: 0, fy: 0, fw: 1, fh: 1 }, { w: 390, h: 800 })
    expect(phone.h * 800).toBeCloseTo(0.4 * 351)
  })
})
