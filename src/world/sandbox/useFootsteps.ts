import { useEffect } from 'react'
import { useCast } from './CastContext'
import { fx } from './fx'

/** A soft footstep every few strides while the chosen character walks (never with reduced motion: nothing walks then). Only on the stage being played. */
export function useFootsteps(enabled = true): void {
  const cast = useCast()
  const walking = enabled && cast.state.actors[cast.state.selected]?.mode === 'walking'
  useEffect(() => {
    if (!walking) return
    const timer = setInterval(() => fx.footstep(), 230)
    return () => clearInterval(timer)
  }, [walking])
}
