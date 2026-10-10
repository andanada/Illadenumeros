import { useEffect, useRef, useState } from 'react'
import type { Pt } from './logic/actorMachine'
import { simulateToss, tossStep, type Ball, type TossBounds } from './logic/toss'

export interface Flight {
  readonly ball: Ball
  readonly room: string
  readonly bounds: TossBounds
}

/** Things in the air. Each lands once (`onLand`), bouncing as it goes; with reduced motion it lands at once. */
export function useFlights(reduced: boolean, onLand: (uid: string, room: string, at: Pt) => void, onBounce: () => void) {
  const [flights, setFlights] = useState<Readonly<Record<string, Flight>>>({})
  const live = useRef<Readonly<Record<string, Flight>>>({})
  const latest = useRef({ onLand, onBounce })
  useEffect(() => {
    latest.current = { onLand, onBounce }
  })
  const flying = Object.keys(flights).length > 0

  useEffect(() => {
    if (!flying) return
    let last = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const dt = Math.min(0.04, (now - last) / 1000)
      last = now
      const next: Record<string, Flight> = {}
      for (const [uid, f] of Object.entries(live.current)) {
        const ball = tossStep(f.ball, dt, f.bounds)
        if (ball.bounces > f.ball.bounces) latest.current.onBounce()
        if (ball.resting) latest.current.onLand(uid, f.room, { x: ball.x, y: ball.y })
        else next[uid] = { ...f, ball }
      }
      live.current = next
      setFlights(next)
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [flying])

  const launchFlight = (uid: string, ball: Ball, room: string, bounds: TossBounds): void => {
    if (reduced) {
      const { final } = simulateToss(ball, bounds)
      onLand(uid, room, { x: final.x, y: final.y })
      return
    }
    live.current = { ...live.current, [uid]: { ball, room, bounds } }
    setFlights(live.current)
  }

  return { flights, launchFlight }
}
