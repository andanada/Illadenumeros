import { useEffect } from 'react'
import { useItems } from '../../../sandbox/ItemsContext'
import { spreadPile, type Area, type Px } from './pileLayout'

export interface SpreadPileOptions {
  readonly def: string
  readonly room: string
  readonly area: Area
  readonly stage: Px
  readonly active: boolean
  /** Changes whenever the pile is laid out again (a new item, a wrong try, the solution shown…). */
  readonly refresh: string
}

/**
 * Re-lays the loose pieces of the request's pile (the ones `useRequestTask` / `useZonesTask` spawned) evenly over
 * `area`. Declare it AFTER the task hook: its effect then runs after the pile was spawned or sent back.
 */
export function useSpreadPile({ def, room, area, stage, active, refresh }: SpreadPileOptions): void {
  const { query, place } = useItems()
  useEffect(() => {
    if (!active) return
    const loose = query(room, def).filter((i) => !i.zone && i.uid.startsWith(`${def}~`))
    spreadPile(loose.length, area, stage).spots.forEach((at, n) => {
      const piece = loose[n]
      if (piece) place(piece.uid, { room, at })
    })
    // The pile follows the request and the room's size, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, def, room, refresh, area.x0, area.x1, area.y0, area.y1, stage.w, stage.h])
}
