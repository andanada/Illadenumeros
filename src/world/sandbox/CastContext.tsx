import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { spawn, type EmoteKind, type Pt } from './logic/actorMachine'
import { anyWalking, castReducer, makeCast, type CastState } from './logic/castState'
import type { Grid } from './logic/pathfind'
import type { SocialKind } from './logic/social'
import { floorGrid, planWalk, snapToFloor } from './logic/walkPlan'
import { parseSeeds, type ActorSeed } from './types'
import { useWorldReducedMotion } from '../scene/useReducedMotion'

export interface Poof {
  readonly n: number
  readonly at: Pt
}

export interface CastApi {
  readonly state: CastState
  readonly seeds: Readonly<Record<string, ActorSeed>>
  readonly order: readonly string[]
  readonly poofs: readonly Poof[]
  readonly announcement: string
  readonly reduced: boolean
  /** Room of actors that never went through a door. */
  readonly defaultRoom: string
  select: (id: string) => void
  /** Walk `id` to `to` around the furniture; `then` runs once they arrive (or at once if already there). */
  walkTo: (id: string, to: Pt, then?: () => void) => void
  teleport: (id: string, to: Pt) => void
  sit: (id: string, seat: string, at: Pt, facing?: 1 | -1) => void
  stand: (id: string) => void
  /** Plays an emote and clears it after `ms`. */
  emote: (id: string, kind: EmoteKind, ms?: number) => void
  setSocial: (kind: SocialKind | undefined) => void
  setCarrying: (id: string, item: string | undefined) => void
  face: (id: string, toward: Pt) => void
  /** Through a door: the actor appears in `room` at `at`, keeping what they carry. */
  enterRoom: (id: string, room: string, at: Pt) => void
  announce: (text: string) => void
  setFloor: (blocks: Parameters<typeof floorGrid>[0], floorTop: number) => void
  poof: (at: Pt) => void
  /** The nearest spot of the floor where someone can stand (around the furniture). */
  snap: (at: Pt) => Pt
  positionOf: (id: string) => Pt
}

const CastContext = createContext<CastApi | undefined>(undefined)

export function useCast(): CastApi {
  const api = useContext(CastContext)
  if (!api) throw new Error('useCast fora d’un CastProvider')
  return api
}

export const useOptionalCast = (): CastApi | undefined => useContext(CastContext)

export interface CastProviderProps {
  seeds: readonly unknown[]
  /** Id selected at the start (default: the first avatar, else the first actor). */
  initialSelected?: string
  /** Room id for actors that have not changed room yet. */
  defaultRoom?: string
  children: React.ReactNode
}

export function CastProvider({ seeds: rawSeeds, initialSelected, defaultRoom = 'sala', children }: CastProviderProps) {
  const reduced = useWorldReducedMotion()
  const parsed = useMemo(() => parseSeeds(rawSeeds), [rawSeeds])
  const seedMap = useMemo(() => Object.fromEntries(parsed.map((s) => [s.id, s])), [parsed])
  const order = useMemo(() => parsed.map((s) => s.id), [parsed])
  const [state, dispatch] = useReducer(
    castReducer,
    undefined,
    () => makeCast(Object.fromEntries(parsed.map((s) => [s.id, spawn(s.at, s.facing ?? 1)])), initialSelected ?? parsed.find((s) => s.kind === 'avatar')?.id ?? parsed[0]?.id ?? ''),
  )
  const [announcement, announce] = useState('')
  const [poofs, setPoofs] = useState<readonly Poof[]>([])
  const live = useRef(state)
  const grid = useRef<Grid>(floorGrid([], 0.4))
  const arrivals = useRef(new Map<string, () => void>())
  const counter = useRef(0)

  useEffect(() => {
    live.current = state
    for (const [id, cb] of arrivals.current) {
      if (state.actors[id]?.mode !== 'walking') {
        arrivals.current.delete(id)
        cb()
      }
    }
  }, [state])

  const walking = anyWalking(state)
  useEffect(() => {
    if (!walking) return
    let last = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      dispatch({ type: 'tick', dtMs: Math.min(50, now - last) })
      last = now
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [walking])

  const poof = useCallback((at: Pt) => {
    counter.current += 1
    const n = counter.current
    setPoofs((list) => [...list, { n, at }])
    setTimeout(() => setPoofs((list) => list.filter((p) => p.n !== n)), 650)
  }, [])

  const positionOf = useCallback((id: string): Pt => live.current.actors[id]?.at ?? { x: 0.5, y: 0.8 }, [])

  const teleport = useCallback(
    (id: string, to: Pt) => {
      const cur = live.current.actors[id]
      if (!cur) return
      const spot = snapToFloor(grid.current, to)
      poof(cur.at)
      poof(spot)
      const { seat: _seat, ...rest } = cur
      dispatch({ type: 'put', id, state: { ...rest, mode: 'idle', at: spot, path: [] } })
    },
    [poof],
  )

  const walkTo = useCallback(
    (id: string, to: Pt, then?: () => void) => {
      const cur = live.current.actors[id]
      if (!cur) return
      if (reduced) {
        const { seat: _s, ...rest } = cur
        const spot = snapToFloor(grid.current, to)
        poof(cur.at)
        poof(spot)
        dispatch({ type: 'put', id, state: { ...rest, mode: 'idle', at: spot, path: [] } })
        if (then) setTimeout(then, 0)
        return
      }
      const path = planWalk(grid.current, cur.at, to)
      if (path.length === 0) {
        if (then) setTimeout(then, 0)
        return
      }
      arrivals.current.delete(id)
      if (then) arrivals.current.set(id, then)
      dispatch({ type: 'actor', id, event: { type: 'walk', path } })
    },
    [reduced, poof],
  )

  const emote = useCallback((id: string, kind: EmoteKind, ms = 1700) => {
    dispatch({ type: 'actor', id, event: { type: 'emote', kind } })
    setTimeout(() => dispatch({ type: 'actor', id, event: { type: 'emoteEnd' } }), ms)
  }, [])

  const api = useMemo<CastApi>(
    () => ({
      state,
      seeds: seedMap,
      order,
      poofs,
      announcement,
      reduced,
      defaultRoom,
      select: (id) => dispatch({ type: 'select', id }),
      walkTo,
      teleport,
      sit: (id, seat, at, facing) => dispatch({ type: 'actor', id, event: { type: 'sit', seat, at, ...(facing ? { facing } : {}) } }),
      stand: (id) => dispatch({ type: 'actor', id, event: { type: 'stand' } }),
      emote,
      setSocial: (kind) => dispatch({ type: 'social', kind }),
      setCarrying: (id, item) => dispatch({ type: 'actor', id, event: item === undefined ? { type: 'drop' } : { type: 'pickup', item } }),
      face: (id, toward) => dispatch({ type: 'actor', id, event: { type: 'face', toward } }),
      enterRoom: (id, room, at) => {
        arrivals.current.delete(id)
        dispatch({ type: 'actor', id, event: { type: 'enter', room, at } })
      },
      announce,
      setFloor: (blocks, floorTop) => {
        grid.current = floorGrid(blocks, floorTop)
      },
      poof,
      snap: (at) => snapToFloor(grid.current, at),
      positionOf,
    }),
    [state, seedMap, order, poofs, announcement, reduced, defaultRoom, walkTo, teleport, emote, poof, positionOf],
  )

  return <CastContext.Provider value={api}>{children}</CastContext.Provider>
}
