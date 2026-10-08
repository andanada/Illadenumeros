/**
 * Deterministic randomness for the art kit. The same seed always draws the same blob, neighbour or
 * shelf, so screenshots, SSR-free renders and tests are stable. Never use Math.random in drawings.
 */
export type Rng = () => number

/** FNV-1a hash of a string to an unsigned 32-bit seed. */
export function hashSeed(seed: string | number): number {
  const text = String(seed)
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32: tiny, fast, good enough for shapes. Returns floats in [0, 1). */
export function rng(seed: string | number): Rng {
  let a = hashSeed(seed)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Float in [min, max). */
export const between = (r: Rng, min: number, max: number): number => min + (max - min) * r()

/** One element of a non-empty list. */
export function pick<T>(r: Rng, list: readonly T[]): T {
  const item = list[Math.floor(r() * list.length)]
  if (item === undefined) throw new Error('pick() needs a non-empty list')
  return item
}
