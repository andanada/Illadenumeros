import { createContext, useContext } from 'react'
import type { Indicator } from '../freePlay'

/**
 * How the bus looks right now (lights, wipers, wheels). Shared through context so the errand tasks,
 * which draw the bus themselves, show the same bus the child is playing with.
 */
export interface BusLook {
  driving: boolean
  night: boolean
  wipers: boolean
  indicator: Indicator
  honks: number
  /** The road scrolls for a moment (a jump along the line during an errand). */
  drive: (stops: number) => void
}

export const DEFAULT_LOOK: BusLook = { driving: false, night: false, wipers: false, indicator: 'off', honks: 0, drive: () => undefined }

export const BusLookContext = createContext<BusLook>(DEFAULT_LOOK)

export const useBusLook = (): BusLook => useContext(BusLookContext)
