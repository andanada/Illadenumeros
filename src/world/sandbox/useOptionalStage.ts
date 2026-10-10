import { useContext } from 'react'
import { StageContext, type StageInfo } from './StageContext'

/** The stage around, when there is one (the Anchor also works over any other positioned scene). */
export const useOptionalStage = (): StageInfo | undefined => useContext(StageContext)
