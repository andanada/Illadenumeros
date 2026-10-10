import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { PropInfo } from '../../../scene/SceneContext'
import { watchSize } from '../../../scene/street/useStreetPan'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { useCast } from '../../../sandbox/CastContext'
import { HouseFrame } from './art/HouseFrame'
import { FloorStage } from './FloorStage'
import { houseLayout } from './layout'
import { walkablesOf } from './walkables'
import { FLOORS, type FloorId, type ZoneId } from './zones'
import type { House } from './useHouse'
import './house.css'

export interface HouseViewProps {
  house: House
  decorating: boolean
  lights: readonly FloorId[]
  onLight: (floor: FloorId) => void
  onDrop: (zone: ZoneId, prop: PropInfo) => void
  /** Called with the scroller so the floor switcher can bring a floor into view. */
  onReady?: (scrollTo: (floor: FloorId) => void, scrolls: boolean) => void
  children?: ReactNode
}

/** The cutaway: roof, three floors (each a sandbox Stage), and the ground. Scrolls only on tall phones. */
export function HouseView({ house, decorating, lights, onLight, onDrop, onReady, children }: HouseViewProps) {
  const cast = useCast()
  const reduced = useWorldReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 1024, h: 768 })

  useEffect(() => {
    const el = root.current
    if (!el) return
    const measure = (): void => setSize({ w: el.clientWidth || 1024, h: el.clientHeight || 768 })
    measure()
    return watchSize(el, measure)
  }, [])

  const layout = useMemo(() => houseLayout(size.w, size.h), [size])
  const stage = useMemo(() => ({ w: size.w, h: layout.floorH }), [size.w, layout.floorH])
  const walks = useMemo(() => Object.fromEntries(FLOORS.map((f) => [f.id, walkablesOf(f.id, house.pieces, stage)])) as Record<FloorId, ReturnType<typeof walkablesOf>>, [house.pieces, stage])

  const mover = cast.state.actors[cast.state.selected]
  const here = (mover?.room ?? cast.defaultRoom) as FloorId
  const gridBlocks = walks[here]?.blocks ?? []

  const scrollTo = useMemo(
    () => (floor: FloorId): void => {
      root.current?.querySelector<HTMLElement>(`[data-floor="${floor}"]`)?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    },
    [reduced],
  )
  useEffect(() => onReady?.(scrollTo, layout.scrolls), [onReady, scrollTo, layout.scrolls])

  // Each stage has its own live region; only the first one speaks (the announcement is the same in all of them).
  useEffect(() => {
    root.current?.querySelectorAll('section[data-stage-room] > p[role="status"]').forEach((el, i) => {
      if (i > 0) el.setAttribute('aria-live', 'off')
    })
  })

  // A tall phone starts on the ground floor, where she is and where the front door is.
  const started = useRef(false)
  useEffect(() => {
    if (!layout.scrolls || started.current) return
    started.current = true
    root.current?.querySelector<HTMLElement>('[data-floor="baixa"]')?.scrollIntoView({ block: 'end' })
  }, [layout.scrolls])

  // Whoever she moves goes upstairs: on a tall phone the house follows her.
  const lastRoom = useRef(here)
  useEffect(() => {
    if (lastRoom.current === here) return
    lastRoom.current = here
    if (layout.scrolls) scrollTo(here)
  }, [here, layout.scrolls, scrollTo])

  return (
    <div ref={root} data-testid="casa-casa" data-casa-here={here} data-night={house.night} className={`relative h-full w-full scroll-pb-44 scroll-pt-20 overflow-x-hidden ${layout.scrolls ? 'overflow-y-auto' : 'overflow-y-hidden'}`}>
      <div className="relative w-full" style={{ height: layout.total }}>
        <HouseFrame roofH={layout.roofH} groundH={layout.groundH} night={house.night} />
        <div className="absolute inset-x-0" style={{ top: layout.roofH }}>
          {FLOORS.map((f) => (
            <FloorStage
              key={f.id}
              floor={f.id}
              height={layout.floorH}
              night={house.night}
              lightOn={lights.includes(f.id)}
              onLight={() => onLight(f.id)}
              pieces={house.pieces}
              lit={house.lit}
              decorating={decorating}
              selectedUid={house.selected?.uid}
              onSelect={house.select}
              onToggleLamp={house.toggleLamp}
              onDrop={onDrop}
              walk={walks[f.id]}
              gridBlocks={gridBlocks}
            >
              {children}
            </FloorStage>
          ))}
        </div>
      </div>
    </div>
  )
}
