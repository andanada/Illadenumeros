import { describe, expect, it } from 'vitest'
import { seatBox } from './busGeometry'

const num = (css: string): number => Number.parseFloat(css)

describe('bus windows', () => {
  it('twenty windows, none overlapping, each half a ten-frame on its own side of the door', () => {
    const boxes = Array.from({ length: 20 }, (_, i) => seatBox(i))
    for (const [i, a] of boxes.entries()) {
      for (const b of boxes.slice(i + 1)) {
        const apart =
          num(a.left) + num(a.width) <= num(b.left) + 1e-9 ||
          num(b.left) + num(b.width) <= num(a.left) + 1e-9 ||
          num(a.top) + num(a.height) <= num(b.top) + 1e-9 ||
          num(b.top) + num(b.height) <= num(a.top) + 1e-9
        expect(apart).toBe(true)
      }
    }
    // The first ten sit left of the door, the second ten right of it, and all stay inside the bus.
    expect(boxes.slice(0, 10).every((b) => num(b.left) + num(b.width) < 43.2)).toBe(true)
    expect(boxes.slice(10).every((b) => num(b.left) > 50)).toBe(true)
    expect(boxes.every((b) => num(b.left) >= 0 && num(b.left) + num(b.width) <= 100 && num(b.top) + num(b.height) <= 100)).toBe(true)
  })

  it('the top row of a frame is the first five, the bottom row the next five', () => {
    expect(num(seatBox(0).top)).toBe(num(seatBox(4).top))
    expect(num(seatBox(5).top)).toBeGreaterThan(num(seatBox(0).top))
    expect(seatBox(5).left).toBe(seatBox(0).left)
  })
})
