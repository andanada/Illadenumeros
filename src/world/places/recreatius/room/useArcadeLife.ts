import { useEffect, useRef } from 'react'
import { useCast } from '../../../sandbox/CastContext'
import { CHILD_ID } from './layout'

const KIDS = ['en-pau', 'la-mei'] as const
const BEAT_MS = 6500

/**
 * The arcade is alive: now and then a kid cheers over their game, and whoever walked out of the door by mistake
 * (anybody but the child) comes back in. Nothing moves on its own with reduced motion.
 */
export function useArcadeLife(): void {
  const cast = useCast()
  const live = useRef(cast)
  useEffect(() => {
    live.current = cast
  })
  useEffect(() => {
    if (cast.reduced) return
    let n = 0
    const timer = setInterval(() => {
      const kid = KIDS[n % KIDS.length]
      n += 1
      const now = live.current
      const me = kid ? now.state.actors[kid] : undefined
      if (kid && me && me.mode === 'idle' && now.state.selected !== kid) now.emote(kid, n % 3 === 0 ? 'cor' : 'riure', 1600)
    }, BEAT_MS)
    return () => clearInterval(timer)
  }, [cast.reduced])

  const strays = Object.entries(cast.state.actors).filter(([id, a]) => id !== CHILD_ID && a.room === 'carrer')
  useEffect(() => {
    for (const [id] of strays) live.current.enterRoom(id, 'sala', { x: 0.14, y: 0.82 })
    // Only when somebody is outside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strays.length])
}
