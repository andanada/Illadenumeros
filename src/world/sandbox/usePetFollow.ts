import { useEffect, useRef } from 'react'
import { useCast } from './CastContext'
import { followSpot } from './logic/social'

const EVERY_MS = 520

/** Pets trail the character they follow at a distance, also through doors (while you do not move them yourself). */
export function usePetFollow(): void {
  const cast = useCast()
  const latest = useRef(cast)
  useEffect(() => {
    latest.current = cast
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const c = latest.current
      for (const seed of Object.values(c.seeds)) {
        if (seed.kind !== 'pet' || !seed.follow || c.state.selected === seed.id) continue
        const pet = c.state.actors[seed.id]
        const leader = c.state.actors[seed.follow]
        if (!pet || !leader || pet.mode === 'walking' || pet.mode === 'sitting' || leader.mode === 'walking') continue
        const petRoom = pet.room ?? c.defaultRoom
        const leaderRoom = leader.room ?? c.defaultRoom
        if (petRoom !== leaderRoom) {
          c.enterRoom(seed.id, leaderRoom, { x: Math.min(0.95, Math.max(0.05, leader.at.x - 0.12)), y: leader.at.y })
          c.poof(leader.at)
          continue
        }
        const spot = followSpot(pet.at, leader.at)
        if (spot) c.walkTo(seed.id, spot)
      }
    }, EVERY_MS)
    return () => clearInterval(timer)
  }, [])
}
