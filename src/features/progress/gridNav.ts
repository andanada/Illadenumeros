import { GRID_SIZE } from './analytics/factHeat'

export interface Pos {
  row: number
  col: number
}

const LAST = GRID_SIZE - 1

/** New position for an arrow/Home/End key, or undefined for any other key. */
export function moveFocus(pos: Pos, key: string, ctrl: boolean): Pos | undefined {
  const clamp = (n: number): number => Math.min(LAST, Math.max(0, n))
  switch (key) {
    case 'ArrowRight':
      return { ...pos, col: clamp(pos.col + 1) }
    case 'ArrowLeft':
      return { ...pos, col: clamp(pos.col - 1) }
    case 'ArrowDown':
      return { ...pos, row: clamp(pos.row + 1) }
    case 'ArrowUp':
      return { ...pos, row: clamp(pos.row - 1) }
    case 'Home':
      return ctrl ? { row: 0, col: 0 } : { ...pos, col: 0 }
    case 'End':
      return ctrl ? { row: LAST, col: LAST } : { ...pos, col: LAST }
    default:
      return undefined
  }
}
