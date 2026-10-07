import { Navigate } from 'react-router-dom'
import { useProgress } from '../core/progress/store'

/** Without an active player with a profile, `/` decides: the picker if there are players, else the start screen. */
export function RequireProfile({ children }: { children: React.ReactNode }) {
  const profile = useProgress((s) => s.profile)
  const hasPlayers = useProgress((s) => s.players.length > 0)
  if (!profile) return <Navigate to={hasPlayers ? '/qui-juga' : '/start'} replace />
  return <>{children}</>
}
