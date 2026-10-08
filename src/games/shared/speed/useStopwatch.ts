import { useCallback, useEffect, useRef, useState } from 'react'

const TICK_MS = 200

export interface Stopwatch {
  /** Visible time since the last restart, paused time excluded (updates ~5 times a second). */
  elapsedMs: number
  /** Exact time since the last restart, paused time excluded. Call from handlers, not during render. */
  read: () => number
  restart: () => void
  pause: () => void
  resume: () => void
  paused: boolean
}

/** Pause-aware stopwatch used to time answers: a paused game never counts as a slow answer. */
export function useStopwatch(): Stopwatch {
  const startedAt = useRef(0)
  const pausedAt = useRef<number | undefined>(undefined)
  const pausedTotal = useRef(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [paused, setPaused] = useState(false)

  const read = useCallback((): number => {
    const reference = pausedAt.current ?? performance.now()
    return Math.max(0, reference - startedAt.current - pausedTotal.current)
  }, [])

  const restart = useCallback(() => {
    startedAt.current = performance.now()
    pausedTotal.current = 0
    pausedAt.current = paused ? performance.now() : undefined
    setElapsedMs(0)
  }, [paused])

  const pause = useCallback(() => {
    if (pausedAt.current !== undefined) return
    pausedAt.current = performance.now()
    setPaused(true)
  }, [])

  const resume = useCallback(() => {
    if (pausedAt.current === undefined) return
    pausedTotal.current += performance.now() - pausedAt.current
    pausedAt.current = undefined
    setPaused(false)
  }, [])

  useEffect(() => {
    startedAt.current = performance.now()
    const id = setInterval(() => {
      if (pausedAt.current === undefined) setElapsedMs(read())
    }, TICK_MS)
    return () => clearInterval(id)
  }, [read])

  return { elapsedMs, read, restart, pause, resume, paused }
}
