import fc from 'fast-check'
import { blobPath, blobPoints, bounds, smoothClosedPath, softRectPath, sparklePath } from './paths'
import { between, hashSeed, pick, rng } from './random'

const NUM = /-?\d+(\.\d+)?/g
const numbers = (d: string): number[] => (d.match(NUM) ?? []).map(Number)

describe('random', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = rng('nyx')
    const b = rng('nyx')
    const c = rng('mixa')
    const seqA = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(seqA)
    expect([c(), c(), c()]).not.toEqual(seqA)
  })

  it('stays in [0, 1)', () => {
    fc.assert(
      fc.property(fc.string(), (seed) => {
        const r = rng(seed)
        return Array.from({ length: 20 }, r).every((v) => v >= 0 && v < 1)
      }),
    )
  })

  it('hashes numbers and strings alike', () => {
    expect(hashSeed(42)).toBe(hashSeed('42'))
  })

  it('between and pick respect their ranges', () => {
    const r = rng(1)
    for (let i = 0; i < 50; i += 1) {
      const v = between(r, 3, 5)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThan(5)
    }
    expect(['a', 'b']).toContain(pick(r, ['a', 'b']))
    expect(() => pick(r, [])).toThrow()
  })
})

describe('smoothClosedPath', () => {
  it('needs three points', () => {
    expect(() => smoothClosedPath([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toThrow()
  })

  it('emits one cubic per point and closes', () => {
    const d = smoothClosedPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ])
    expect(d.startsWith('M0 0')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(d.match(/C/g)).toHaveLength(4)
  })
})

describe('blobPath', () => {
  it('is deterministic and seed-dependent', () => {
    const opts = { cx: 50, cy: 50, rx: 40, seed: 'casa' }
    expect(blobPath(opts)).toBe(blobPath(opts))
    expect(blobPath(opts)).not.toBe(blobPath({ ...opts, seed: 'botiga' }))
  })

  it('keeps its control points within the wobble band', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 14 }),
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        fc.string(),
        (points, wobble, seed) => {
          const pts = blobPoints({ cx: 0, cy: 0, rx: 100, ry: 60, points, wobble, seed })
          const b = bounds(pts)
          const lim = 1 + wobble + 1e-9
          return pts.length === points && b.maxX <= 100 * lim && b.minX >= -100 * lim && b.maxY <= 60 * lim && b.minY >= -60 * lim
        },
      ),
    )
  })

  it('rounds coordinates to one decimal', () => {
    const d = blobPath({ cx: 13.3333, cy: 7.777, rx: 9.123, seed: 3 })
    expect(numbers(d).every((n) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-6)).toBe(true)
  })
})

describe('softRectPath', () => {
  it('without wobble stays inside its box', () => {
    const d = softRectPath({ x: 10, y: 20, w: 100, h: 50, r: 12 })
    const ns = numbers(d)
    const xs = ns.filter((_, i) => i % 2 === 0)
    const ys = ns.filter((_, i) => i % 2 === 1)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(10)
    expect(Math.max(...xs)).toBeLessThanOrEqual(110)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(20)
    expect(Math.max(...ys)).toBeLessThanOrEqual(70)
  })

  it('clamps the radius to half the short side', () => {
    const d = softRectPath({ x: 0, y: 0, w: 20, h: 10, r: 99 })
    expect(d.startsWith('M5 0')).toBe(true)
  })

  it('wobble changes the shape deterministically', () => {
    const base = { x: 0, y: 0, w: 80, h: 80, wobble: 3, seed: 'x' }
    expect(softRectPath(base)).toBe(softRectPath(base))
    expect(softRectPath(base)).not.toBe(softRectPath({ ...base, wobble: 0 }))
  })
})

describe('sparklePath', () => {
  it('reaches exactly its size on the four axes', () => {
    const d = sparklePath(0, 0, 10)
    expect(d).toContain('M0 -10')
    expect(d).toContain(' 10 0')
    expect(d).toContain(' 0 10')
    expect(d).toContain(' -10 0')
  })
})
