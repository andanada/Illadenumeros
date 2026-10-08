import { useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { between, rng } from '../art/random'

const BLINK_MS = 130

/**
 * Natural blinking: closed for ~130 ms every 2–5.5 s, with an occasional double blink.
 * Seeded so a crowd of neighbours never blinks in sync. Off with reduced motion or `enabled=false`.
 */
export function useBlink(enabled: boolean, seed: string): boolean {
  const reduced = useReducedMotion() ?? false
  const [closed, setClosed] = useState(false)
  const random = useRef(rng(`blink-${seed}`))

  useEffect(() => {
    if (!enabled || reduced) return undefined
    let timer: ReturnType<typeof setTimeout>
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        setClosed(true)
        timer = setTimeout(() => {
          setClosed(false)
          const double = random.current() < 0.18
          schedule(double ? 160 : between(random.current, 2000, 5500))
        }, BLINK_MS)
      }, delay)
    }
    schedule(between(random.current, 600, 3000))
    return () => clearTimeout(timer)
  }, [enabled, reduced])

  return enabled && !reduced && closed
}

/** True when the system asks for less motion (wrapper so callers don't import motion directly). */
export function useCalm(): boolean {
  return useReducedMotion() ?? false
}
