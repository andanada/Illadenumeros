import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { todayKey, useProgress } from '../../core/progress/store'
import { buildBoard } from '../board/boardPlan'
import type { SceneId } from '../model/types'
import type { PlaceModule } from '../places/types'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { governorContext, setOpenPlaces } from './context'
import { isQuotaDone, jarLevel, minutesLeft, waitingAt, waitingTotal, type DayState } from './dayState'
import { dismissReveal, openDay, resolveAt, syncRequests, tickPlayed, useRequestStore, wakeRequests, type DayReveal } from './requestStore'

/** The governor looks at the town this often (ms); the same beat counts the time played. */
export const TICK_MS = 5000
/** Coins of a clean answer (right at the first try, no help): the engine's petals. */
export const CLEAN_COINS = 3

export interface Jar {
  /** 0..1 */
  readonly level: number
  readonly minutesLeft: number
  readonly done: boolean
}

export interface TownRequests {
  readonly day: DayState | undefined
  /** Requests waiting (bubble up) in the whole town / at one place. */
  readonly pending: number
  readonly pendingAt: (place: SceneId) => number
  /** A request was solved at the place (`coins` = what the answer gave). */
  readonly resolve: (place: SceneId, coins: number) => void
  /** She came into the place: calm requests wake up. */
  readonly wake: (place: SceneId) => void
  readonly jar: Jar
  readonly reveal: DayReveal | undefined
  readonly dismiss: () => void
}

/**
 * Today's ambient requests for the active child: opens the day, keeps the governor beating while the
 * town is on screen, and exposes what the shell needs. `now` is the clock (injected by tests).
 */
export function useRequestEngine(now: () => number, openPlaces: readonly PlaceModule[]): TownRequests {
  const state = useRequestStore((s) => s.day)
  const status = useRequestStore((s) => s.status)
  const reveal = useRequestStore((s) => s.reveal)
  const activeId = useProgress((s) => s.activePlayerId)
  const day = todayKey(now())
  const opening = useRef<string | undefined>(undefined)
  const [, setBeat] = useState(0)
  const places = useMemo(() => openPlaces.map((p) => ({ id: p.id, skills: p.skills })), [openPlaces])
  const clock = useRef(now)
  useEffect(() => {
    clock.current = now
    setOpenPlaces(places)
  })

  useEffect(() => {
    if (activeId === undefined) return
    if (status === 'ready' && state?.day === day) return
    const key = `${activeId}:${day}:${status}`
    if (opening.current === key) return
    opening.current = key
    const { skillStates, factStates } = useProgress.getState()
    void openDay(day, () => buildBoard({ day, places, skills: MATES_SKILLS, states: skillStates, factStates }).tasks, governorContext(day, now(), places))
  }, [activeId, status, state?.day, day, places, now])

  // The governor's beat: time played, new requests when due, bubbles calming down.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      tickPlayed(TICK_MS)
      void syncRequests(governorContext(todayKey(clock.current()), clock.current(), places))
      setBeat((n) => n + 1)
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [places])

  const today = state?.day === day ? state : undefined
  const nowMs = now()
  const pendingAt = useCallback((place: SceneId) => (today ? waitingAt(today, place, nowMs).length : 0), [today, nowMs])
  const resolve = useCallback((place: SceneId, coins: number) => void resolveAt(place, coins >= CLEAN_COINS, governorContext(day, clock.current(), places)), [day, places])
  const wake = useCallback((place: SceneId) => void wakeRequests(place, governorContext(day, clock.current(), places)), [day, places])
  const jar = useMemo<Jar>(() => ({ level: today ? jarLevel(today) : 0, minutesLeft: today ? minutesLeft(today) : 0, done: today ? isQuotaDone(today) : false }), [today])
  return { day: today, pending: today ? waitingTotal(today, nowMs) : 0, pendingAt, resolve, wake, jar, reveal, dismiss: dismissReveal }
}
