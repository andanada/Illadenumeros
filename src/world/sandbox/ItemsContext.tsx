import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useCast } from './CastContext'
import { defMap, type DefMap, type InteractableDef } from './defs'
import { fx } from './fx'
import type { Pt } from './logic/actorMachine'
import { itemsReducer, makeItem, type ItemState, type Items, type ItemsAction } from './logic/itemsState'
import { countsKey, zoneCounts, zoneTotal } from './logic/zones'
import { makeActions, type ActionDeps, type Actions } from './useActions'
import { makeOps, type ItemOps } from './useItemOps'
import type { ChangeEvent, ZoneDef } from './zoneTypes'
import { useFlights, type Flight } from './useFlights'
import type { DoorDef } from './types'

export interface Ripple {
  readonly n: number
  readonly at: Pt
}

export interface ItemsApi extends Actions, ItemOps {
  readonly items: Items
  readonly zones: Readonly<Record<string, ZoneDef>>
  /** Subscribes to changes of any zone's contents; returns the unsubscribe function. */
  onChange: (listener: (event: ChangeEvent) => void) => () => void
  readonly defs: DefMap
  readonly defaultRoom: string
  readonly floorTop: number
  readonly flights: Readonly<Record<string, Flight>>
  readonly ripples: readonly Ripple[]
  readonly ringOpen: boolean
  setRingOpen: (open: boolean) => void
}

const ItemsContext = createContext<ItemsApi | undefined>(undefined)

/** The world's objects and everything that can be done with them; with a selector, just what it picks. */
export function useItems(): ItemsApi
export function useItems<T>(select: (api: ItemsApi) => T): T
export function useItems<T>(select?: (api: ItemsApi) => T): ItemsApi | T {
  const api = useContext(ItemsContext)
  if (!api) throw new Error('useItems fora d’un ItemsProvider')
  return select ? select(api) : api
}

/** How many things (of one def, or all) lie in a counting zone right now. Re-renders when it changes. */
export function useZoneCount(zoneId: string, defId?: string): number {
  return useItems((api) => (defId ? (zoneCounts(api.items, zoneId)[defId] ?? 0) : zoneTotal(api.items, zoneId)))
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
  /** Counting zones (basket, bowl, tray…); they lay out what is put in them and report it. */
  zones?: readonly ZoneDef[]
  children: React.ReactNode
}

const NO_ZONES: readonly ZoneDef[] = []

const toState = (s: StartItem): ItemState => makeItem(s.uid, s.def, s.inside ? { t: 'in', box: s.inside } : { t: 'floor', room: s.room, at: s.at })

/** The world's objects plus every tap that means something (the actions); lives inside a CastProvider. */
export function ItemsProvider({ defs, start, floorTop = 0.42, onEnter, zones = NO_ZONES, children }: ItemsProviderProps) {
  const cast = useCast()
  const defaultRoom = cast.defaultRoom
  const defsById = useMemo(() => defMap(defs), [defs])
  const zonesById = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])) as Readonly<Record<string, ZoneDef>>, [zones])
  const [items, rawDispatch] = useReducer(itemsReducer, undefined, () => Object.fromEntries(start.map((s) => [s.uid, toState(s)])) as Items)
  // The reducer is pure: applying it to a mirror at once lets spawn → place work inside one event.
  const fresh = useRef<Items>(items)
  const dispatch = useCallback((a: ItemsAction): void => {
    fresh.current = itemsReducer(fresh.current, a)
    rawDispatch(a)
  }, [])
  const listeners = useRef(new Set<(event: ChangeEvent) => void>())
  const lastKeys = useRef<Record<string, string>>({})
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

  const opsLatest = useRef({ cast, defs: defsById, zones: zonesById, fresh: () => fresh.current, send: dispatch })
  const ops = useMemo(() => makeOps(() => opsLatest.current), [])
  const deps: ActionDeps = { cast, items, defs: defsById, defaultRoom, floorTop, dispatch, launchFlight, onEnter, ripple, zones: zonesById, takeOne: ops.takeOne }
  const latest = useRef(deps)
  useLayoutEffect(() => {
    latest.current = deps
    opsLatest.current = { cast, defs: defsById, zones: zonesById, fresh: () => fresh.current, send: dispatch }
  })

  useEffect(() => {
    for (const zone of Object.values(zonesById)) {
      const counts = zoneCounts(items, zone.id)
      const key = countsKey(counts)
      if (lastKeys.current[zone.id] === key) continue
      const first = lastKeys.current[zone.id] === undefined
      lastKeys.current = { ...lastKeys.current, [zone.id]: key }
      if (first && key === '') continue
      const event: ChangeEvent = { zone: zone.id, counts, total: zoneTotal(items, zone.id) }
      zone.onChange?.(event)
      for (const l of listeners.current) l(event)
    }
  }, [items, zonesById])
  const onChange = useCallback((listener: (event: ChangeEvent) => void) => {
    listeners.current.add(listener)
    return () => void listeners.current.delete(listener)
  }, [])
  const actions = useMemo(() => makeActions(() => latest.current), [])

  const api = useMemo<ItemsApi>(
    () => ({ ...actions, ...ops, zones: zonesById, onChange, items, defs: defsById, defaultRoom, floorTop, flights, ripples, ringOpen, setRingOpen }),
    [actions, ops, zonesById, onChange, items, defsById, defaultRoom, floorTop, flights, ripples, ringOpen],
  )
  return <ItemsContext.Provider value={api}>{children}</ItemsContext.Provider>
}
