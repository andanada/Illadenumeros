import { useCallback, useEffect, useRef, useState } from 'react'
import { useMotionValue, type MotionValue } from 'motion/react'
import { clamp, stepToward } from './walkLogic'

export interface StreetWalk {
  /** Where she stands, in street units. */
  x: MotionValue<number>
  walking: boolean
  /** How many walks she has started (also the instant ones of reduced motion). */
  moves: number
  /** 1 = looks right, -1 = looks left. */
  facing: 1 | -1
  /** Walk to a street position (clamped to the street); `then` runs on arrival. Instant with reduced motion. */
  walkTo: (target: number, then?: () => void) => void
  /** Keep walking toward one end until `stop`. */
  hold: (dir: 1 | -1) => void
  stop: () => void
}

interface Run {
  target: number
  then: (() => void) | undefined
  frame: number | undefined
}

/**
 * The avatar's walk along the street, one frame at a time. `follow(x, dtMs)` lets the street move its camera
 * with her (dtMs = Infinity means «snap»). Nothing re-renders per frame: she is a motion value.
 */
export function useStreetWalk(opts: { initial: number; min: number; max: number; reduced: boolean; follow: (x: number, dtMs: number) => void }): StreetWalk {
  const x = useMotionValue(opts.initial)
  const [state, setState] = useState<{ walking: boolean; facing: 1 | -1 }>({ walking: false, facing: 1 })
  const [moves, setMoves] = useState(0)
  const run = useRef<Run | undefined>(undefined)
  const latest = useRef(opts)
  useEffect(() => {
    latest.current = opts
  })

  const stop = useCallback(() => {
    const r = run.current
    if (r?.frame !== undefined) cancelAnimationFrame(r.frame)
    run.current = undefined
    setState((s) => (s.walking ? { ...s, walking: false } : s))
  }, [])

  const walkTo = useCallback(
    (target: number, then?: () => void) => {
      const o = latest.current
      stop()
      setMoves((m) => m + 1)
      const goal = clamp(target, o.min, o.max)
      const from = x.get()
      if (o.reduced || Math.abs(goal - from) < 1) {
        x.set(goal)
        o.follow(goal, Infinity)
        then?.()
        return
      }
      const r: Run = { target: goal, then, frame: undefined }
      run.current = r
      setState({ walking: true, facing: goal > from ? 1 : -1 })
      let last = performance.now()
      const tick = (now: number): void => {
        if (run.current !== r) return
        const dt = Math.min(50, Math.max(1, now - last))
        last = now
        const step = stepToward(x.get(), r.target, dt)
        x.set(step.x)
        latest.current.follow(step.x, dt)
        if (step.arrived) {
          run.current = undefined
          setState((s) => ({ ...s, walking: false }))
          r.then?.()
          return
        }
        r.frame = requestAnimationFrame(tick)
      }
      r.frame = requestAnimationFrame(tick)
    },
    [stop, x],
  )

  const hold = useCallback(
    (dir: 1 | -1) => {
      const o = latest.current
      walkTo(dir > 0 ? o.max : o.min)
    },
    [walkTo],
  )

  useEffect(() => stop, [stop])

  return { x, moves, walking: state.walking, facing: state.facing, walkTo, hold, stop }
}
