import type { Rect } from '../../../sandbox/logic/zones'
import type { Area, Px } from '../../shared/hands/pileLayout'

export type Side = 'left' | 'right'

/** The part of a floor the frame (or the pile) may use: between the stair columns, split in two halves. */
const HALF: Readonly<Record<Side, readonly [number, number]>> = { left: [0.1, 0.5], right: [0.5, 0.9] }
const FLOOR_TOP = 0.5
const BOTTOM = 0.97
const MAX_CELL = 54

export interface Frame {
  readonly rect: Rect
  readonly cols: number
  readonly capacity: number
}

export const sideOf = (x: number): Side => (x >= 0.5 ? 'right' : 'left')
export const otherSide = (s: Side): Side => (s === 'left' ? 'right' : 'left')

/** The ten-frame(s) on the asker's half of the floor: 5 wide for one frame, 10 wide for two, as big as fits. */
export function frameLayout(capacity: 10 | 20, side: Side, stage: Px): Frame {
  const cols = capacity === 20 && stage.w >= 700 ? 10 : 5
  const rows = Math.ceil(capacity / cols)
  const [x0, x1] = HALF[side]
  const cell = Math.min(MAX_CELL, ((x1 - x0) * stage.w) / cols, ((BOTTOM - FLOOR_TOP) * stage.h) / rows)
  const w = (cols * cell) / stage.w
  const h = (rows * cell) / stage.h
  return { rect: { x: (x0 + x1) / 2 - w / 2, y: BOTTOM - h, w, h }, cols, capacity }
}

/** The pile to carry from lies on the other half of the same floor (the range is where the feet of the pieces stand). */
export function pileAreaOf(side: Side): Area {
  const [x0, x1] = HALF[otherSide(side)]
  return { x0, x1, y0: FLOOR_TOP + 0.04, y1: BOTTOM }
}
