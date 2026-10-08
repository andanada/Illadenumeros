import { useEffect, useState } from 'react'

const BEAT_MS = 700

/** Index (0..count-1) of the beat the metronome points at; stays still when `running` is false (reduced motion). */
export function useBeat(count: number, running: boolean): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!running || count < 2) return undefined
    const id = setInterval(() => setTick((t) => t + 1), BEAT_MS)
    return () => clearInterval(id)
  }, [running, count])
  return count > 0 ? tick % count : 0
}
