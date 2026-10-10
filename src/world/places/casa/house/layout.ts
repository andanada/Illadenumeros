/** Sizes of the cutaway for a screen: three floors between a roof and the ground, scrolling only on tall phones. */
export interface HouseLayout {
  readonly floorH: number
  readonly roofH: number
  readonly groundH: number
  /** The cutaway is taller than the screen: the house scrolls and the floor switcher helps. */
  readonly scrolls: boolean
  readonly total: number
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

export function houseLayout(width: number, height: number): HouseLayout {
  const portrait = height > width * 1.05
  const roofH = portrait ? 72 : clamp(Math.round(height * 0.09), 56, 84)
  const groundH = portrait ? 156 : clamp(Math.round(height * 0.1), 72, 92)
  const fitted = Math.floor((height - roofH - groundH) / 3)
  const floorH = portrait ? clamp(Math.round(width * 0.8), 250, 340) : clamp(fitted, 180, 330)
  const total = roofH + groundH + floorH * 3
  return { floorH, roofH, groundH, scrolls: total > height + 1, total }
}
