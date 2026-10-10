import type { ReactNode } from 'react'
import { StageContext, useStage } from '../../../sandbox/StageContext'
import { pieceUnit } from './pieceUnit'

/** Draws its children with the furniture unit, so cabinets, claw machine and counter always fit side by side. */
export function PieceScale({ children }: { children: ReactNode }) {
  const stage = useStage()
  return <StageContext.Provider value={{ ...stage, unit: pieceUnit(stage.unit, stage.w) }}>{children}</StageContext.Provider>
}
