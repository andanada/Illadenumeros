import { useEffect, useState } from 'react'
import { todayKey } from '../../core/progress/store'
import type { SceneId } from '../model/types'
import { governorContext } from './context'
import { CLEAN_COINS } from './useRequestEngine'
import { liveAt } from './dayState'
import { resolveAt, useRequestStore, wakeRequests } from './requestStore'
import { statusAt, type Request, type RequestStatus } from './types'

export interface PlaceRequest extends Request {
  readonly status: RequestStatus
}

export interface PlaceRequests {
  /** Live requests of the place, waiting ones first (calm ones can be re-woken). */
  readonly requests: readonly PlaceRequest[]
  readonly waiting: number
  /** Solved one: `coins` = what the answer gave (3 = clean). Counts for the jar and may trigger the day's gift. */
  readonly resolveRequest: (coins: number) => void
  /** Wake the place's calm requests (she tapped a calm character). */
  readonly wakeRequests: () => void
}

const POLL_MS = 1000

/**
 * The requests of one place, for the place's own scene (step S2: one bubble per anchored character).
 * Solving one uses the place's usual adapters / useErrand / useQuestionFlow; this only records it.
 */
export function useRequests(placeId: SceneId, now: () => number = Date.now): PlaceRequests {
  const state = useRequestStore((s) => s.day)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), POLL_MS)
    return () => clearInterval(timer)
  }, [])
  const at = now()
  const requests = state
    ? liveAt(state, placeId)
        .map((r) => ({ ...r, status: statusAt(r, at) }))
        .sort((a, b) => Number(a.status === 'calm') - Number(b.status === 'calm'))
    : []
  const day = todayKey(at)
  const resolveRequest = (coins: number): void => void resolveAt(placeId, coins >= CLEAN_COINS, governorContext(day, now()))
  const wake = (): void => void wakeRequests(placeId, governorContext(day, now()))
  void tick
  return { requests, waiting: requests.filter((r) => r.status === 'waiting').length, resolveRequest, wakeRequests: wake }
}
