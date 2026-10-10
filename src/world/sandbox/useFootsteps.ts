import { useEffect } from 'react'
import { useCast } from './CastContext'
import { fx } from './fx'

/** A soft footstep every few strides while the chosen character walks (never with reduced motion: nothing walks then). */
export function useFootsteps(): void {
  const cast = useCast()
  const walking = cast.state.actors[cast.state.selected]?.mode === 'walking'
  useEffect(() => {
    if (!walking) return
    const timer = setInterval(() => fx.footstep(), 230)
    return () => clearInterval(timer)
  }, [walking])
}
