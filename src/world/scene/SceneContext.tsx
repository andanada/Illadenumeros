import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { Point } from './logic/dragMachine'
import { zoneAt, type ZoneShape } from './logic/hitTest'
import { EMPTY_HAND, tapPlaceReducer, toPlace, type Held, type TapPlaceState } from './logic/tapPlace'
import { worldSfx } from './worldSfx'

/** What the scene knows about a movable prop. `kind` lets zones decide ("product:poma", "coin:50", "tag"). */
export interface PropInfo {
  id: string
  /** Catalan, with article: "la poma", "la moneda de 50 cèntims". */
  label: string
  kind: string
}

export interface ZoneRegistration {
  id: string
  /** Catalan, with article: "la cistella". */
  label: string
  accepts: (prop: PropInfo) => boolean
  onDrop: (prop: PropInfo) => void
  element: () => HTMLElement | null
  z?: number
}

export interface SceneApi {
  registerZone: (zone: ZoneRegistration) => () => void
  /** Zones accepting the prop, in registration (reading) order. */
  zonesFor: (prop: PropInfo) => ZoneRegistration[]
  held: Held | undefined
  heldProp: PropInfo | undefined
  hoverZoneId: string | undefined
  /** Tap-to-place: hold (or let go of) a prop. */
  pick: (prop: PropInfo) => void
  /** Tap-to-place: put the held prop in a zone. Returns true when accepted. */
  place: (zoneId: string) => boolean
  cancel: () => void
  /** Drag: the zone under the finger while moving (for the highlight). */
  hover: (prop: PropInfo, point: Point) => void
  /** Drag: the finger lifted at `point`. Returns true when a zone took the prop. */
  release: (prop: PropInfo, point: Point) => boolean
  announce: (text: string) => void
  announcement: string
}

const SceneContext = createContext<SceneApi | undefined>(undefined)

export function useScene(): SceneApi {
  const api = useContext(SceneContext)
  if (!api) throw new Error('useScene fora d’una escena')
  return api
}

const shapeOf = (zone: ZoneRegistration): (ZoneShape & { reg: ZoneRegistration }) | undefined => {
  const el = zone.element()
  if (!el) return undefined
  const r = el.getBoundingClientRect()
  return { id: zone.id, rect: { left: r.left, top: r.top, width: r.width, height: r.height }, ...(zone.z !== undefined ? { z: zone.z } : {}), reg: zone }
}

export function useSceneApi(): SceneApi {
  const zones = useRef<ZoneRegistration[]>([])
  const [hand, setHand] = useState<{ state: TapPlaceState; prop: PropInfo | undefined }>({ state: EMPTY_HAND, prop: undefined })
  const [hoverZoneId, setHoverZoneId] = useState<string | undefined>(undefined)
  const [announcement, setAnnouncement] = useState('')

  const registerZone = useCallback((zone: ZoneRegistration) => {
    zones.current = [...zones.current.filter((z) => z.id !== zone.id), zone]
    return () => {
      zones.current = zones.current.filter((z) => z !== zone)
    }
  }, [])

  const zonesFor = useCallback((prop: PropInfo) => zones.current.filter((z) => z.accepts(prop)), [])

  const handRef = useRef(hand)
  const updateHand = useCallback((next: { state: TapPlaceState; prop: PropInfo | undefined }) => {
    handRef.current = next
    setHand(next)
  }, [])

  const pick = useCallback(
    (prop: PropInfo) => {
      const step = tapPlaceReducer(handRef.current.state, { type: 'pick', propId: prop.id, label: prop.label })
      setAnnouncement(step.announce)
      updateHand({ state: step.state, prop: step.state.held ? prop : undefined })
    },
    [updateHand],
  )

  const place = useCallback(
    (zoneId: string): boolean => {
      const zone = zones.current.find((z) => z.id === zoneId)
      const { prop, state } = handRef.current
      if (!zone || !prop) return false
      const step = tapPlaceReducer(state, { type: 'place', zoneId, zoneLabel: zone.label, accepted: zone.accepts(prop) })
      setAnnouncement(step.announce)
      updateHand({ state: step.state, prop: undefined })
      if (step.effect?.type === 'drop') {
        worldSfx.plop()
        zone.onDrop(prop)
        return true
      }
      worldSfx.boing()
      return false
    },
    [updateHand],
  )

  const cancel = useCallback(() => {
    const step = tapPlaceReducer(handRef.current.state, { type: 'cancel' })
    if (step.announce) setAnnouncement(step.announce)
    updateHand({ state: step.state, prop: undefined })
  }, [updateHand])

  const findZone = useCallback((prop: PropInfo, point: Point) => {
    const shapes = zones.current.map(shapeOf).filter((s): s is NonNullable<typeof s> => s !== undefined)
    return zoneAt(shapes, point, (s) => s.reg.accepts(prop))
  }, [])

  const hover = useCallback((prop: PropInfo, point: Point) => setHoverZoneId(findZone(prop, point)?.id), [findZone])

  const release = useCallback(
    (prop: PropInfo, point: Point): boolean => {
      setHoverZoneId(undefined)
      const hit = findZone(prop, point)
      if (!hit) return false
      setAnnouncement(`Has posat ${prop.label} ${toPlace(hit.reg.label)}.`)
      updateHand({ state: EMPTY_HAND, prop: undefined })
      hit.reg.onDrop(prop)
      return true
    },
    [findZone, updateHand],
  )

  return useMemo(
    () => ({ registerZone, zonesFor, held: hand.state.held, heldProp: hand.prop, hoverZoneId, pick, place, cancel, hover, release, announce: setAnnouncement, announcement }),
    [registerZone, zonesFor, hand, hoverZoneId, pick, place, cancel, hover, release, announcement],
  )
}

export function SceneProvider({ api, children }: { api: SceneApi; children: React.ReactNode }) {
  return <SceneContext.Provider value={api}>{children}</SceneContext.Provider>
}
