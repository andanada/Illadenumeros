import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useCast } from './CastContext'
import { defMap, type DefMap, type InteractableDef } from './defs'
import { fx } from './fx'
import type { Pt } from './logic/actorMachine'
import { itemsReducer, makeItem, type ItemState, type Items } from './logic/itemsState'
import { makeActions, type ActionDeps, type Actions } from './useActions'
import { useFlights, type Flight } from './useFlights'
import type { DoorDef } from './types'

export interface Ripple {
  readonly n: number
  readonly at: Pt
}

export interface ItemsApi extends Actions {
  readonly items: Items
  readonly defs: DefMap
  readonly defaultRoom: string
  readonly floorTop: number
  readonly flights: Readonly<Record<string, Flight>>
  readonly ripples: readonly Ripple[]
  readonly ringOpen: boolean
  setRingOpen: (open: boolean) => void
}

const ItemsContext = createContext<ItemsApi | undefined>(undefined)

export function useItems(): ItemsApi {
  const api = useContext(ItemsContext)
  if (!api) throw new Error('useItems fora d’un ItemsProvider')
  return api
}

export interface StartItem {
  uid: string
  def: string
  room: string
  at: Pt
  /** Starts inside this container instead of on the floor. */
  inside?: string
}

export interface ItemsProviderProps {
  defs: readonly InteractableDef[]
  start: readonly StartItem[]
  /** Where the floor begins (fraction of stage height); landing spots never go above it. */
  floorTop?: number
  /** Called after an actor walked through a door (the sandbox already moved them). */
  onEnter?: (door: DoorDef, actorId: string) => void
  children: React.ReactNode
}

const toState = (s: StartItem): ItemState => makeItem(s.uid, s.def, s.inside ? { t: 'in', box: s.inside } : { t: 'floor', room: s.room, at: s.at })

/** The world's objects plus every tap that means something (the actions); lives inside a CastProvider. */
export function ItemsProvider({ defs, start, floorTop = 0.42, onEnter, children }: ItemsProviderProps) {
  const cast = useCast()
  const defaultRoom = cast.defaultRoom
  const defsById = useMemo(() => defMap(defs), [defs])
  const [items, dispatch] = useReducer(itemsReducer, undefined, () => Object.fromEntries(start.map((s) => [s.uid, toState(s)])) as Items)
  const [ringOpen, setRingOpen] = useState(false)
  const [ripples, setRipples] = useState<readonly Ripple[]>([])
  const counter = useRef(0)

  const ripple = useCallback((at: Pt) => {
    counter.current += 1
    const n = counter.current
    setRipples((list) => [...list, { n, at }])
    setTimeout(() => setRipples((list) => list.filter((r) => r.n !== n)), 700)
  }, [])

  const { flights, launchFlight } = useFlights(
    cast.reduced,
    (uid, room, at) => dispatch({ type: 'drop', uid, room, at }),
    () => fx.squish(),
  )

  const deps: ActionDeps = { cast, items, defs: defsById, defaultRoom, floorTop, dispatch, launchFlight, onEnter, ripple }
  const latest = useRef(deps)
  useLayoutEffect(() => {
    latest.current = deps
  })
  const actions = useMemo(() => makeActions(() => latest.current), [])

  const api = useMemo<ItemsApi>(
    () => ({ ...actions, items, defs: defsById, defaultRoom, floorTop, flights, ripples, ringOpen, setRingOpen }),
    [actions, items, defsById, defaultRoom, floorTop, flights, ripples, ringOpen],
  )
  return <ItemsContext.Provider value={api}>{children}</ItemsContext.Provider>
}
