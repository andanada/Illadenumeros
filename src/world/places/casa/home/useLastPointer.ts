import { useEffect, useRef, type RefObject } from 'react'

export interface PointerMark {
  x: number
  y: number
  at: number
}

/** How fresh a finger position must be to count as "where she dropped it". */
export const FRESH_MS = 800

/**
 * Remembers the last finger / mouse position on the page (capture phase, so it is known before any drop
 * handler runs). Drop zones only learn *what* was dropped; the room also needs *where*.
 */
export interface PointerTrack {
  /** Where the last press started (a drag's grab point). */
  down: PointerMark | undefined
  /** The latest position (a drag's drop point, a tap). */
  last: PointerMark | undefined
}

export function useLastPointer(): RefObject<PointerTrack> {
  const track = useRef<PointerTrack>({ down: undefined, last: undefined })
  useEffect(() => {
    const mark = (event: PointerEvent | MouseEvent): void => {
      const now = { x: event.clientX, y: event.clientY, at: performance.now() }
      track.current = event.type === 'pointerdown' ? { down: now, last: now } : { ...track.current, last: now }
    }
    const opts = { capture: true, passive: true } as const
    window.addEventListener('pointermove', mark, opts)
    window.addEventListener('pointerup', mark, opts)
    window.addEventListener('pointerdown', mark, opts)
    window.addEventListener('click', mark, opts)
    return () => {
      window.removeEventListener('pointermove', mark, opts)
      window.removeEventListener('pointerup', mark, opts)
      window.removeEventListener('pointerdown', mark, opts)
      window.removeEventListener('click', mark, opts)
    }
  }, [])
  return track
}

/** The mark when it is recent and inside `rect`; undefined otherwise (keyboard, stale). */
export function freshPointIn(mark: PointerMark | undefined, rect: { left: number; top: number; width: number; height: number }, now: number): { x: number; y: number } | undefined {
  if (!mark || now - mark.at > FRESH_MS) return undefined
  // A keyboard "click" reports (0, 0): not a real position.
  if (mark.x === 0 && mark.y === 0) return undefined
  const inside = mark.x >= rect.left && mark.x <= rect.left + rect.width && mark.y >= rect.top && mark.y <= rect.top + rect.height
  return inside ? { x: mark.x, y: mark.y } : undefined
}
