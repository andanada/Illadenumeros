import { personHeight } from '../../../sandbox/Actor'
import type { Rect } from '../../../sandbox/logic/zones'
import { depthScale } from '../../../sandbox/StageContext'
import type { Area, Px } from '../../shared/hands/pileLayout'
import { SIDE_CAPACITY, type SideId } from './clipTask'

export interface HeadFrame {
  readonly side: SideId
  readonly rect: Rect
  readonly cols: number
}

const COLS = 3
const GAP_PX = 6

/**
 * The two places for clips on a customer who sits at `seat` (fractions of the stage): a neat block on each side of
 * her head, as big as her size allows. They follow the real size of the drawing, so they sit on the head on any screen.
 */
export function headFrames(seat: { x: number; y: number }, stage: Px, floorTop: number): readonly HeadFrame[] {
  const unit = Math.min(stage.h, stage.w * 0.9)
  const body = personHeight(unit) * depthScale(seat.y, floorTop)
  const cell = Math.min(34, Math.max(26, body * 0.15))
  const rows = Math.ceil(SIDE_CAPACITY / COLS)
  const wPx = COLS * cell
  const hPx = rows * cell
  const half = body * 0.22
  const centreY = seat.y * stage.h - body * 0.5
  const top = Math.max(0.02, (centreY - hPx / 2) / stage.h)
  const frame = (side: SideId, left: number): HeadFrame => ({ side, cols: COLS, rect: { x: Math.max(0.01, Math.min(0.99 - wPx / stage.w, left / stage.w)), y: top, w: wPx / stage.w, h: hPx / stage.h } })
  const x = seat.x * stage.w
  return [frame('esq', x - half - GAP_PX - wPx), frame('dre', x + half + GAP_PX)]
}

/** The box of clips lies on the floor at the left, above the tools (their touch boxes reach up to the pieces otherwise) and the exit button. */
export const CLIP_PILE: Area = { x0: 0.1, x1: 0.3, y0: 0.64, y1: 0.78 }

/** On a narrow screen the box would be a few pixels wide: it spreads over the whole width of the floor, in front of the chairs. */
export const CLIP_PILE_COMPACT: Area = { x0: 0.04, x1: 0.96, y0: 0.62, y1: 0.76 }

export const clipPileArea = (compact: boolean): Area => (compact ? CLIP_PILE_COMPACT : CLIP_PILE)
