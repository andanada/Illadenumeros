import { useEffect, useLayoutEffect, useRef } from 'react'
import { useCast } from '../../../sandbox/CastContext'
import { ANIMALS, START } from './cast'

const TICK_MS = 3200
const SPOTS = [
  { x: 0.24, y: 0.78 },
  { x: 0.46, y: 0.86 },
  { x: 0.64, y: 0.72 },
  { x: 0.82, y: 0.88 },
  { x: 0.36, y: 0.64 },
] as const

/**
 * The gentle life of the farm: everybody starts in their own part, and the animals wander a little from time
 * to time (one at a time, to a spot that is never the same twice running). Plain moves of the cast, so with
 * reduced motion they simply appear there.
 */
export function useFarmLife(paused: boolean): void {
  const cast = useCast()
  const api = useRef(cast)
  const clock = useRef(0)
  const stopped = useRef(paused)
  useLayoutEffect(() => {
    api.current = cast
    stopped.current = paused
  })

  useLayoutEffect(() => {
    for (const [id, s] of Object.entries(START)) api.current.enterRoom(id, s.room, s.at)
    // Once, at the start.
  }, [])

  useEffect(() => {
    const herd = [...ANIMALS.corral, ...ANIMALS.hort]
    const timer = setInterval(() => {
      if (stopped.current) return
      clock.current += 1
      const id = herd[clock.current % herd.length]
      const spot = SPOTS[(clock.current * 3) % SPOTS.length]
      if (id && spot && api.current.state.actors[id]?.mode === 'idle' && api.current.state.selected !== id) api.current.walkTo(id, spot)
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [])
}
