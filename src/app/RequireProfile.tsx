import { Navigate } from 'react-router-dom'
import { useProgress } from '../core/progress/store'

/** Sends the child to the start screen when there is no saved profile yet. */
export function RequireProfile({ children }: { children: React.ReactNode }) {
  const profile = useProgress((s) => s.profile)
  if (!profile) return <Navigate to="/start" replace />
  return <>{children}</>
}
