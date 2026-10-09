import { seatPlace } from '../errands/seatsLogic'
import { CELL, FRAME_X, H, pct, ROW_Y, W } from './busConstants'

/** Where window `index` sits on the bus drawing, as CSS percentages of the bus box. */
export function seatBox(index: number): { left: string; top: string; width: string; height: string } {
  const { frame, row, col } = seatPlace(index)
  const x = (FRAME_X[frame] ?? 0) + col * CELL.step
  const y = ROW_Y[row] ?? 0
  return { left: pct(x, W), top: pct(y, H), width: pct(CELL.w, W), height: pct(CELL.h, H) }
}
