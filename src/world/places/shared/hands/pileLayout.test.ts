import { describe, expect, it } from 'vitest'
import { pileAreaOf } from '../../casa/world/homeLayout'
import { CLIP_PILE, CLIP_PILE_COMPACT } from '../../perruqueria/world/clipLayout'
import { spreadPile, type Area, type Px } from './pileLayout'

const area: Area = { x0: 0.1, x1: 0.5, y0: 0.55, y1: 0.97 }

/** No piece's middle lies under the touch box of another one (boxes are `hit` px square, standing on the piece's feet). */
function separated(spots: readonly { x: number; y: number }[], stage: Px, hit: number): boolean {
  return spots.every((a, i) => spots.every((b, j) => i === j || Math.abs(a.x - b.x) * stage.w >= hit / 2 - 1e-6 || Math.abs(a.y - b.y) * stage.h >= hit - 1e-6))
}

describe('spreadPile', () => {
  it('lays out exactly n spots inside the area', () => {
    for (const n of [0, 1, 7, 22]) {
      const { spots } = spreadPile(n, area, { w: 1024, h: 207 })
      expect(spots).toHaveLength(n)
      for (const s of spots) {
        expect(s.x).toBeGreaterThanOrEqual(area.x0)
        expect(s.x).toBeLessThanOrEqual(area.x1)
        expect(s.y).toBeGreaterThanOrEqual(area.y0 - 1e-9)
        expect(s.y).toBeLessThanOrEqual(area.y1)
      }
    }
  })

  it('is deterministic and never puts two pieces on the same spot', () => {
    const a = spreadPile(22, area, { w: 390, h: 312 })
    expect(a).toEqual(spreadPile(22, area, { w: 390, h: 312 }))
    expect(new Set(a.spots.map((s) => `${s.x.toFixed(4)}/${s.y.toFixed(4)}`)).size).toBe(22)
  })

  it('keeps the touch size as big as the area allows and shrinks it only when the pieces would not fit', () => {
    expect(spreadPile(6, area, { w: 1024, h: 600 }).hit).toBe(64)
    expect(spreadPile(40, { x0: 0.1, x1: 0.2, y0: 0.9, y1: 0.97 }, { w: 390, h: 300 }).hit).toBeLessThan(64)
  })
})

interface Case {
  readonly name: string
  readonly area: Area
  readonly stage: Px
}

// The real areas of both places on the three screens (the stage is as wide as the window; one floor of the house is ~0.8 of the width tall on a phone).
const CASES: readonly Case[] = [
  ...(['left', 'right'] as const).flatMap((side) => [
    { name: `casa ${side} iPad`, area: pileAreaOf(side), stage: { w: 1024, h: 207 } },
    { name: `casa ${side} escriptori`, area: pileAreaOf(side), stage: { w: 1180, h: 220 } },
    { name: `casa ${side} mòbil`, area: pileAreaOf(side), stage: { w: 390, h: 312 } },
  ]),
  { name: 'perruqueria iPad', area: CLIP_PILE, stage: { w: 1024, h: 684 } },
  { name: 'perruqueria escriptori', area: CLIP_PILE, stage: { w: 1180, h: 736 } },
  { name: 'perruqueria mòbil', area: CLIP_PILE_COMPACT, stage: { w: 390, h: 585 } },
]

describe('the piles of Casa and Perruqueria keep every piece touchable', () => {
  for (const c of CASES) {
    it(`${c.name}: up to 10 pieces keep the full 64 px box, up to 12 at least 48 px, 22 at least 32 px, and nobody hides a neighbour`, () => {
      for (const [n, min] of [[6, 64], [10, 64], [12, 48], [22, 32]] as const) {
        const pile = spreadPile(n, c.area, c.stage)
        expect(pile.hit, `${c.name} ${n}`).toBeGreaterThanOrEqual(min)
        expect(separated(pile.spots, c.stage, pile.hit), `${c.name} ${n}`).toBe(true)
      }
    })
  }
})
