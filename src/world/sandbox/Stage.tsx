import { useEffect, useMemo, useRef, useState } from 'react'
import { watchSize } from '../scene/street/useStreetPan'
import { Actor } from './Actor'
import { ActorRing } from './ActorRing'
import { ActorSwitcher } from './ActorSwitcher'
import { useCast } from './CastContext'
import { Hotspots } from './Hotspots'
import { hotRects } from './hotRects'
import { Zones } from './Zones'
import { ItemsLayer } from './ItemsLayer'
import { useItems } from './ItemsContext'
import type { Pt } from './logic/actorMachine'
import type { Block } from './logic/walkPlan'
import type { Rect } from './logic/zones'
import { Feedback } from './Feedback'
import { StageContext } from './StageContext'
import { useFootsteps } from './useFootsteps'
import { usePetFollow } from './usePetFollow'
import type { DoorDef, SeatDef, SurfaceDef } from './types'
import './sandbox.css'

export interface StageProps {
  /** Accessible name of the room («La sala»). */
  label: string
  /** Room id: only actors and objects of this room are drawn. */
  room: string
  /** Where the floor begins (fraction of the height from the top). */
  floorTop?: number
  /** The wall, the floor and the furniture art (drawn behind everything that moves). */
  backdrop?: React.ReactNode
  /** Furniture the actors must walk around, as fractions of the stage. */
  blocks?: readonly Block[]
  seats?: readonly SeatDef[]
  doors?: readonly DoorDef[]
  surfaces?: readonly SurfaceDef[]
  /** More things in the room (extra scenery above the floor, bubbles…). */
  children?: React.ReactNode
  className?: string
  /** The «Qui mous?» buttons (default true). */
  switcher?: boolean
  /**
   * A stage that is only shown, not the one being played (the other floors of a house, a backdrop room):
   * no footsteps, no pet-follow, no announcements, no ring, no puffs. It still describes its walking grid.
   */
  passive?: boolean
  /** Rectangles (fractions of the stage) pets never walk into when they trail someone. Seats, doors and zones are added. */
  petFree?: readonly Rect[]
}

const STEP = 0.07
const DIRS: Readonly<Record<string, Pt>> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } }

/**
 * A room where the cast lives: tap the floor to walk, tap things to use them. Arrow keys walk the chosen
 * character a step at a time, Tab reaches every actor, object, seat and door.
 */
export function Stage({ label, room, floorTop = 0.42, backdrop, blocks = [], seats = [], doors = [], surfaces = [], children, className = '', switcher = true, passive = false, petFree = [] }: StageProps) {
  const cast = useCast()
  const items = useItems()
  const ref = useRef<HTMLElement | null>(null)
  const [size, setSize] = useState({ w: 800, h: 500 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = (): void => setSize({ w: el.clientWidth || 800, h: el.clientHeight || 500 })
    measure()
    return watchSize(el, measure)
  }, [])

  const key = JSON.stringify(blocks)
  const { setFloor } = cast
  useEffect(() => {
    setFloor(blocks, floorTop, room)
    // `key` stands for the blocks' content.
  }, [key, floorTop, setFloor, room])

  const hot = useMemo(() => hotRects(seats, doors, surfaces, size, floorTop), [seats, doors, surfaces, size, floorTop])
  const info = useMemo(() => ({ w: size.w, h: size.h, unit: Math.min(size.h, size.w * 0.9), room, floorTop, hot }), [size, room, floorTop, hot])
  const zoneRects = useMemo(() => Object.values(items.zones).filter((z) => z.room === room).map((z) => z.rect), [items.zones, room])
  const avoid = useMemo(() => [...petFree, ...zoneRects, ...hot.map(({ x, y, w, h }) => ({ x, y, w, h }))], [petFree, zoneRects, hot])
  const selected = cast.state.selected
  usePetFollow(!passive, room, avoid)
  useFootsteps(!passive)

  const onFloorClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const box = e.currentTarget.getBoundingClientRect()
    items.setRingOpen(false)
    items.tapFloor({ x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
    const dir = DIRS[e.key]
    if (dir) {
      const me = cast.state.actors[selected]
      if (!me || (e.target instanceof HTMLElement && e.target.closest('[data-ring]'))) return
      e.preventDefault()
      items.setRingOpen(false)
      cast.walkTo(selected, { x: Math.min(0.97, Math.max(0.03, me.at.x + dir.x * STEP)), y: Math.min(0.97, Math.max(floorTop + 0.02, me.at.y + dir.y * STEP)) })
    } else if (e.key === 'Escape') {
      items.setRingOpen(false)
      cast.setSocial(undefined)
    }
  }

  return (
    <StageContext.Provider value={info}>
      <section ref={ref} aria-label={label} data-stage-room={room} onKeyDown={onKeyDown} className={`relative isolate h-full w-full select-none overflow-hidden ${className}`}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
          {backdrop}
        </div>
        <div data-testid="stage-floor" aria-hidden="true" onClick={onFloorClick} className="absolute inset-0 z-[1] cursor-pointer" />
        {children}
        <Hotspots seats={seats} doors={doors} surfaces={surfaces} />
        <Zones />
        <ItemsLayer />
        {cast.order.map((id) => (
          <Actor key={id} id={id} />
        ))}
        {!passive && <Feedback />}
        {!passive && <ActorRing />}
        {switcher && !passive && <ActorSwitcher />}
        {!passive && (
          <p role="status" aria-live="polite" className="sr-only">
            {cast.announcement}
          </p>
        )}
      </section>
    </StageContext.Provider>
  )
}
