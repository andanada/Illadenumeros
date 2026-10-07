export interface Size {
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
  index: number
  value: number
}

const finitePositive = (n: number): boolean => Number.isFinite(n) && n > 0

/** A readable axis maximum (1, 2, 5 times a power of ten, or 1.5x for small ranges). Always > 0. */
export function niceMax(values: readonly number[]): number {
  const max = Math.max(0, ...values.filter(finitePositive))
  if (max === 0) return 1
  const scale = 10 ** Math.floor(Math.log10(max))
  const steps = [1, 1.5, 2, 3, 5, 7.5, 10]
  const step = steps.find((s) => s * scale >= max) ?? 10
  return step * scale
}

/** Bars side by side with a small gap; heights proportional to `max`. */
export function barRects(values: readonly number[], size: Size, max: number): Rect[] {
  if (values.length === 0) return []
  const slot = size.width / values.length
  const width = slot * 0.7
  const top = max > 0 ? max : 1
  return values.map((value, i) => {
    const safe = Number.isFinite(value) && value > 0 ? Math.min(value, top) : 0
    const height = (safe / top) * size.height
    return { x: i * slot + (slot - width) / 2, y: size.height - height, width, height }
  })
}

/** Points scaled into `size` (y grows downwards) and the runs of consecutive defined values. */
export function lineSegments(values: readonly (number | undefined)[], size: Size, min: number, max: number): { segments: Point[][]; points: Point[] } {
  const span = max - min > 0 ? max - min : 1
  const stepX = values.length > 1 ? size.width / (values.length - 1) : 0
  const segments: Point[][] = []
  const points: Point[] = []
  let current: Point[] = []
  values.forEach((value, index) => {
    if (value === undefined || !Number.isFinite(value)) {
      if (current.length > 0) segments.push(current)
      current = []
      return
    }
    const x = values.length > 1 ? index * stepX : size.width / 2
    const y = size.height - ((Math.min(Math.max(value, min), max) - min) / span) * size.height
    const point = { x, y, index, value }
    points.push(point)
    current.push(point)
  })
  if (current.length > 0) segments.push(current)
  return { segments, points }
}
