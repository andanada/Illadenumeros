import { createContext, useContext } from 'react'
import type { HotRect } from './logic/layers'

export interface StageInfo {
  /** Stage size in px. */
  readonly w: number
  readonly h: number
  /** Reference length for sizes: the stage height, but never more than 0.9 of its width (tall phones). */
  readonly unit: number
  readonly room: string
  readonly floorTop: number
  /** Seats, doors and spots on screen: pets never cover them. */
  readonly hot?: readonly HotRect[]
}

export const StageContext = createContext<StageInfo | undefined>(undefined)

export function useStage(): StageInfo {
  const info = useContext(StageContext)
  if (!info) throw new Error('useStage fora d’un Stage')
  return info
}

/** Depth: things lower on the floor are nearer, so a little bigger (0.84 at the wall line, 1.08 at the front). */
export const depthScale = (y: number, floorTop: number): number => 0.84 + 0.24 * Math.min(1, Math.max(0, (y - floorTop) / (1 - floorTop)))

/** Stacking order from the floor position. */
export const stackOf = (y: number): number => 10 + Math.round(y * 1000)
