import { Navigate } from 'react-router-dom'
import type { GameProps } from '../features/play/gameTypes'

/** The town's place ids are game ids for the attempts log; opening one as a game leads to the town. */
export function PobleRedirect(_props: GameProps) {
  return <Navigate to="/poble" replace />
}
