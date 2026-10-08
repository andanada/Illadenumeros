/**
 * Pure drag state machine for scene props. Pointer events go in, a new state and at most one effect come out.
 * A press that never moves past the threshold is a tap (reaction + tap-to-place), never a drop.
 */

export interface Point {
  x: number
  y: number
}

export type DragState =
  | { phase: 'idle' }
  | { phase: 'pressed'; propId: string; pointerId: number; origin: Point; at: Point }
  | { phase: 'dragging'; propId: string; pointerId: number; origin: Point; at: Point }

export type DragEvent =
  | { type: 'down'; propId: string; pointerId: number; point: Point }
  | { type: 'move'; pointerId: number; point: Point }
  | { type: 'up'; pointerId: number; point: Point }
  | { type: 'cancel'; pointerId: number }

export type DragEffect =
  | { type: 'pickup'; propId: string }
  | { type: 'tap'; propId: string }
  | { type: 'release'; propId: string; point: Point }
  | { type: 'abort'; propId: string }

export interface DragStep {
  state: DragState
  effect?: DragEffect
}

/** Pixels a finger may wobble before a press becomes a drag (a child's tap is never perfectly still). */
export const DRAG_THRESHOLD_PX = 8

export const IDLE: DragState = { phase: 'idle' }

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

/** Offset of the dragged prop from where it was picked up. */
export const dragOffset = (state: DragState): Point =>
  state.phase === 'dragging' ? { x: state.at.x - state.origin.x, y: state.at.y - state.origin.y } : { x: 0, y: 0 }

export function dragReducer(state: DragState, event: DragEvent, threshold = DRAG_THRESHOLD_PX): DragStep {
  switch (event.type) {
    case 'down':
      // A second finger while one is already busy is ignored.
      if (state.phase !== 'idle') return { state }
      return { state: { phase: 'pressed', propId: event.propId, pointerId: event.pointerId, origin: event.point, at: event.point } }
    case 'move': {
      if (state.phase === 'idle' || state.pointerId !== event.pointerId) return { state }
      if (state.phase === 'pressed') {
        if (distance(state.origin, event.point) < threshold) return { state: { ...state, at: event.point } }
        return { state: { ...state, phase: 'dragging', at: event.point }, effect: { type: 'pickup', propId: state.propId } }
      }
      return { state: { ...state, at: event.point } }
    }
    case 'up': {
      if (state.phase === 'idle' || state.pointerId !== event.pointerId) return { state }
      if (state.phase === 'pressed') return { state: IDLE, effect: { type: 'tap', propId: state.propId } }
      return { state: IDLE, effect: { type: 'release', propId: state.propId, point: event.point } }
    }
    case 'cancel': {
      if (state.phase === 'idle' || state.pointerId !== event.pointerId) return { state }
      return { state: IDLE, ...(state.phase === 'dragging' ? { effect: { type: 'abort', propId: state.propId } as const } : {}) }
    }
  }
}
