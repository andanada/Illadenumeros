import { useEffect, useLayoutEffect, useRef } from 'react'
import { useCast } from '../../../sandbox/CastContext'
import { CAT, SHOPPERS, STROLL } from './cast'

const TICK_MS = 3000

/**
 * The life of the square: the shoppers stroll from stall to stall (one at a time, never the one the child is
 * moving, nor the one whose bubble is up: whoever asks stands still, so the bubble is where the child saw it), the cat dozes on the bench. Plain moves of the cast, so with reduced motion they simply appear.
 */
export function useMarketLife(paused: boolean, carrier: string | undefined): void {
  const cast = useCast()
  const api = useRef(cast)
  const clock = useRef(0)
  const stopped = useRef(paused)
  const asking = useRef(carrier)
  useLayoutEffect(() => {
    api.current = cast
    stopped.current = paused
    asking.current = carrier
  })

  useLayoutEffect(() => {
    api.current.sit(CAT, 'banc-placa', { x: 0.45, y: 0.7 }, -1)
    // Once, at the start.
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      if (stopped.current) return
      clock.current += 1
      const id = SHOPPERS[clock.current % SHOPPERS.length]
      const spot = STROLL[(clock.current * 2) % STROLL.length]
      const me = id ? api.current.state.actors[id] : undefined
      if (id && id !== asking.current && spot && me?.mode === 'idle' && api.current.state.selected !== id) api.current.walkTo(id, spot)
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [])
}
