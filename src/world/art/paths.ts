import { between, rng } from './random'

/**
 * Pure SVG path generators. Everything returns a `d` string with coordinates rounded to 0.1,
 * which keeps the DOM small (tablets) and makes output stable for snapshot-style tests.
 */
export interface Point {
  x: number
  y: number
}

const r1 = (n: number): number => Math.round(n * 10) / 10
const fmt = (p: Point): string => `${r1(p.x)} ${r1(p.y)}`

/**
 * Smooth closed curve through the points (Catmull-Rom converted to cubic Béziers).
 * `tension` 0 = polygon, 1 = very round. Needs at least 3 points.
 */
export function smoothClosedPath(points: readonly Point[], tension = 1): string {
  const n = points.length
  if (n < 3) throw new Error('smoothClosedPath needs at least 3 points')
  const at = (i: number): Point => points[((i % n) + n) % n] as Point
  const k = tension / 6
  const segments = points.map((p1, i) => {
    const p0 = at(i - 1)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1 = { x: p1.x + (p2.x - p0.x) * k, y: p1.y + (p2.y - p0.y) * k }
    const c2 = { x: p2.x - (p3.x - p1.x) * k, y: p2.y - (p3.y - p1.y) * k }
    return `C${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`
  })
  return `M${fmt(at(0))}${segments.join('')}Z`
}

export interface BlobOptions {
  cx: number
  cy: number
  rx: number
  ry?: number
  /** Number of control points around the ellipse (default 7). */
  points?: number
  /** 0..0.5, how far each radius may drift from the ellipse (default 0.08). */
  wobble?: number
  seed: string | number
}

/** The control points of an organic blob: an ellipse whose radii drift a little, seeded. */
export function blobPoints({ cx, cy, rx, ry = rx, points = 7, wobble = 0.08, seed }: BlobOptions): Point[] {
  const r = rng(seed)
  const phase = between(r, 0, Math.PI * 2)
  return Array.from({ length: Math.max(3, points) }, (_, i) => {
    const angle = phase + (i / Math.max(3, points)) * Math.PI * 2
    const drift = 1 + between(r, -wobble, wobble)
    return { x: cx + Math.cos(angle) * rx * drift, y: cy + Math.sin(angle) * ry * drift }
  })
}

/** Organic, slightly lumpy closed shape. Same seed, same shape. */
export function blobPath(options: BlobOptions): string {
  return smoothClosedPath(blobPoints(options))
}

export interface SoftRectOptions {
  x: number
  y: number
  w: number
  h: number
  /** Corner radius, clamped to half the short side. */
  r?: number
  /** Pixels each side may bulge or pinch (default 0 = perfect rounded rect). */
  wobble?: number
  seed?: string | number
}

/**
 * Rounded rectangle whose straight sides bow very slightly in or out, like a hand-cut paper shape.
 * With wobble 0 it is an exact rounded rectangle.
 */
export function softRectPath({ x, y, w, h, r = 12, wobble = 0, seed = 0 }: SoftRectOptions): string {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  const g = rng(seed)
  const bow = (): number => (wobble === 0 ? 0 : between(g, -wobble, wobble))
  const [top, right, bottom, left] = [bow(), bow(), bow(), bow()]
  const x2 = x + w
  const y2 = y + h
  const mx = x + w / 2
  const my = y + h / 2
  return [
    `M${fmt({ x: x + rr, y })}`,
    `Q${fmt({ x: mx, y: y - top * 2 })} ${fmt({ x: x2 - rr, y })}`,
    `Q${fmt({ x: x2, y })} ${fmt({ x: x2, y: y + rr })}`,
    `Q${fmt({ x: x2 + right * 2, y: my })} ${fmt({ x: x2, y: y2 - rr })}`,
    `Q${fmt({ x: x2, y: y2 })} ${fmt({ x: x2 - rr, y: y2 })}`,
    `Q${fmt({ x: mx, y: y2 + bottom * 2 })} ${fmt({ x: x + rr, y: y2 })}`,
    `Q${fmt({ x, y: y2 })} ${fmt({ x, y: y2 - rr })}`,
    `Q${fmt({ x: x - left * 2, y: my })} ${fmt({ x, y: y + rr })}`,
    `Q${fmt({ x, y })} ${fmt({ x: x + rr, y })}Z`,
  ].join('')
}

/** Four-pointed twinkle star centred on (cx, cy). `pinch` 0..1: how thin the arms are. */
export function sparklePath(cx: number, cy: number, size: number, pinch = 0.28): string {
  const s = size
  const p = size * pinch
  return [
    `M${fmt({ x: cx, y: cy - s })}`,
    `Q${fmt({ x: cx + p, y: cy - p })} ${fmt({ x: cx + s, y: cy })}`,
    `Q${fmt({ x: cx + p, y: cy + p })} ${fmt({ x: cx, y: cy + s })}`,
    `Q${fmt({ x: cx - p, y: cy + p })} ${fmt({ x: cx - s, y: cy })}`,
    `Q${fmt({ x: cx - p, y: cy - p })} ${fmt({ x: cx, y: cy - s })}Z`,
  ].join('')
}

/** Bounding box of a list of points (used by tests and by layout helpers). */
export function bounds(points: readonly Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  return points.reduce(
    (b, p) => ({
      minX: Math.min(b.minX, p.x),
      minY: Math.min(b.minY, p.y),
      maxX: Math.max(b.maxX, p.x),
      maxY: Math.max(b.maxY, p.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  )
}
