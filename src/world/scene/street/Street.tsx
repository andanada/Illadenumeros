import { motion, useTransform } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { unlockAudio } from '../../../core/audio/sfx'
import { speak } from '../../../core/audio/speech'
import type { AvatarSpec, SceneId } from '../../model/types'
import { Grain, PropArt } from '../art'
import { useWorldReducedMotion } from '../useReducedMotion'
import { worldSfx } from '../worldSfx'
import { StreetArrow } from './StreetArrow'
import { StreetAvatar } from './StreetAvatar'
import { ClosedOverlay, FutureLot, Hills } from './StreetArt'
import { centreOf, layoutStreet, type LaidSpot } from './streetLayout'
import { useStreetPan, watchSize } from './useStreetPan'
import { useStreetWalk } from './useStreetWalk'
import { atDoor, cameraFor, followOffset, streetXAt, walkBounds } from './walkLogic'

/** One lot of the street as the town shell sees it. */
export interface StreetSpot {
  readonly id: SceneId
  /** Lower-case article form: «la Botiga». */
  readonly name: string
  readonly open: boolean
  /** PropArt id or the place's own façade; undefined = not built yet. */
  readonly facade: string | ComponentType<{ open: boolean }> | undefined
}

export interface StreetProps {
  avatar: AvatarSpec
  spots: readonly StreetSpot[]
  /** She reached an open door (or tapped it while standing there): go in. `from` is the door's box. */
  onEnter: (place: SceneId, from: DOMRect) => void
  /** Camera offset to start at (remembered when coming back out of a place): she stands in the middle of the screen. */
  initialOffset?: number
  onOffsetChange?: (offset: number) => void
  /** «Vés-hi!» from the errand board: walk to that place, then go in. A new nonce = a new walk. */
  walkTo?: { id: SceneId; nonce: number }
  /** Speech bubble over her avatar («Hola, Laia!»), until she starts walking. */
  greeting?: string
  /** What she carries, as SVG content for her hand (centred on 0,0, ~44 px wide): it stays with her through doors. */
  carrying?: ReactNode
}

const BUILDING_UNITS_H = 340

/** Building scale from the available height: big on tablets, still whole on a phone. */
const scaleFor = (height: number, width: number): number => Math.max(0.55, Math.min(1.15, (height * 0.55) / BUILDING_UNITS_H, width > 0 ? width / 400 : 1.15))

const capital = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1)

function Facade({ spot, box, scale, tint }: { spot: StreetSpot; box: LaidSpot; scale: number; tint: number }) {
  const { facade } = spot
  if (facade === undefined) return <FutureLot w={box.w} h={box.h} tint={tint} />
  if (typeof facade === 'string') return <PropArt id={facade} size={box.h * scale} title="" shadow={false} className="block" />
  const Own = facade
  return (
    <span className="absolute inset-0 block">
      <Own open={spot.open} />
    </span>
  )
}

/** The street she walks: tap the ground or a door, hold an arrow, or use the arrow keys. The camera follows her. */
export function Street({ avatar, spots, onEnter, initialOffset, onOffsetChange, walkTo, greeting, carrying }: StreetProps) {
  const reduced = useWorldReducedMotion()
  const [size, setSize] = useState({ w: 0, h: 640 })
  const layout = useMemo(() => layoutStreet(spots.map((s) => s.id)), [spots])
  const scale = scaleFor(size.h, size.w)
  const width = layout.length * scale
  const shop = layout.spots.find((s) => s.id === 'botiga') ?? layout.spots[0]
  const shopCentre = shop ? centreOf(shop) : 150
  const bounds = walkBounds(layout.length)
  const pan = useStreetPan(width, reduced, initialOffset ?? 0)
  const back = useTransform(pan.x, (v) => v * 0.45)
  const front = useTransform(pan.x, (v) => v * 1.2)
  const doors = useRef(new Map<SceneId, HTMLElement>())
  const [entering, setEntering] = useState(false)
  const [greet, setGreet] = useState(greeting !== undefined)

  // The camera glides after her (it only moves while she walks, so dragging the street around still works).
  const view = useRef({ scale, viewport: pan.viewport, min: pan.min })
  useEffect(() => {
    view.current = { scale, viewport: pan.viewport, min: pan.min }
  })
  const follow = useCallback(
    (x: number, dtMs: number) => {
      const v = view.current
      if (v.viewport === 0) return
      const target = cameraFor(x, v.scale, v.viewport, v.min)
      pan.x.set(Number.isFinite(dtMs) ? followOffset(pan.x.get(), target, dtMs) : target)
    },
    [pan.x],
  )
  const walk = useStreetWalk({ initial: shopCentre, min: bounds.min, max: bounds.max, reduced, follow })

  useEffect(() => {
    const el = pan.viewportRef.current
    if (!el) return
    const measure = (): void => setSize({ w: el.clientWidth, h: el.clientHeight || 640 })
    measure()
    return watchSize(el, measure)
  }, [pan.viewportRef])

  // First frame with a real size: she stands where the camera was (coming back out of a place) or by the shop (first visit).
  const placed = useRef(false)
  useEffect(() => {
    if (placed.current || pan.viewport === 0 || size.w === 0) return
    placed.current = true
    if (initialOffset !== undefined) walk.x.set(Math.min(bounds.max, Math.max(bounds.min, (pan.viewport / 2 - initialOffset) / scale)))
    else pan.x.set(cameraFor(shopCentre, scale, pan.viewport, pan.min))
  }, [pan, walk.x, size.w, initialOffset, scale, shopCentre, bounds.min, bounds.max])

  useEffect(() => (onOffsetChange ? pan.x.on('change', onOffsetChange) : undefined), [pan.x, onOffsetChange])

  // The greeting stays until she walks.
  useEffect(() => {
    if (walk.moves > 0) setGreet(false)
  }, [walk.moves])

  const goIn = useCallback(
    (spot: StreetSpot): void => {
      const el = doors.current.get(spot.id)
      worldSfx.doorbell()
      setEntering(true)
      onEnter(spot.id, el ? el.getBoundingClientRect() : new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0))
    },
    [onEnter],
  )

  const visit = useCallback(
    (spot: StreetSpot): void => {
      const box = layout.spots.find((s) => s.id === spot.id)
      if (!box) return
      const door = centreOf(box)
      if (atDoor(walk.x.get(), door, box.w)) goIn(spot)
      else walk.walkTo(door, () => goIn(spot))
    },
    [layout.spots, walk, goIn],
  )

  // «Vés-hi!»: walk to the place, then go in. The latest `visit` lives in a ref so re-renders mid-walk never cancel it.
  const latest = useRef({ spots, visit })
  useEffect(() => {
    latest.current = { spots, visit }
  })
  useEffect(() => {
    if (!walkTo) return
    const spot = latest.current.spots.find((s) => s.id === walkTo.id)
    if (!spot?.open) return
    // A beat first, so even when she already stands there the child sees her about to knock.
    const timer = setTimeout(() => latest.current.visit(spot), reduced ? 0 : 400)
    return () => clearTimeout(timer)
    // A new nonce is a new walk; `reduced` is read at that moment.
  }, [walkTo])

  const tapSpot = (spot: StreetSpot): void => {
    unlockAudio()
    if (spot.open) return visit(spot)
    worldSfx.boing()
    speak('Obrim aviat!')
  }

  const { viewportRef, handlers } = pan
  const tapGround = (e: React.MouseEvent<HTMLDivElement>): void => {
    if ((e.target as HTMLElement).closest('button')) return
    unlockAudio()
    const left = e.currentTarget.getBoundingClientRect().left
    walk.walkTo(streetXAt(e.clientX, left, pan.x.get(), scale))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.target !== e.currentTarget || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    e.preventDefault()
    if (!e.repeat) walk.hold(e.key === 'ArrowRight' ? 1 : -1)
  }
  const onKeyUp = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') walk.stop()
  }

  /** A stride from where the camera is looking, so the arrows work like the old street arrows. */
  const stride = (dir: 1 | -1): void => walk.walkTo((pan.viewport / 2 - pan.x.get()) / scale + (dir * pan.viewport * 0.7) / scale)

  const avatarSize = Math.round(170 * scale)
  return (
    <div
      ref={viewportRef}
      {...handlers}
      onPointerDown={(e) => {
        walk.stop()
        handlers.onPointerDown(e)
      }}
      onClick={tapGround}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      tabIndex={0}
      role="group"
      aria-label="El carrer. Toca el terra o fes servir les fletxes per caminar."
      data-testid="street"
      className="relative h-full w-full touch-pan-y overflow-hidden outline-none focus-visible:outline-8 focus-visible:-outline-offset-8 focus-visible:outline-[var(--world-focus,#4da6ec)]"
      style={{ background: 'linear-gradient(var(--world-sky-top, #8fd3ff), var(--world-sky-bottom, #d7f0ff))' }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute right-[10%] top-[14%]">
        <PropArt id="sol" size={Math.round(110 * scale)} title="" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute left-[6%] top-[18%]">
        <PropArt id="nuvol-cel" size={Math.round(64 * scale)} title="" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute left-[46%] top-[30%] opacity-80">
        <PropArt id="nuvol-cel" size={Math.round(44 * scale)} title="" />
      </div>
      <motion.div style={{ x: back, width: width * 0.6 + 600 }} className="pointer-events-none absolute bottom-[24%] left-0">
        <Hills width={width * 0.6 + 600} />
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 h-[26%]" style={{ background: 'var(--world-ground, #f3e3c3)' }}>
        <div className="h-3 w-full" style={{ background: 'var(--world-ground-shade, #e6cfa4)' }} />
      </div>
      <motion.ul aria-label="El carrer" style={{ x: pan.x, width }} className="absolute bottom-[24%] left-0 h-0">
        {layout.spots.map((box, i) => {
          const spot = spots.find((s) => s.id === box.id)
          if (!spot) return null
          return (
            <li key={spot.id} className="absolute bottom-0" style={{ left: box.x * scale, width: box.w * scale, height: box.h * scale }}>
              <motion.button
                type="button"
                ref={(el: HTMLButtonElement | null) => {
                  if (el) doors.current.set(spot.id, el)
                  else doors.current.delete(spot.id)
                }}
                aria-label={spot.open ? `Entra a ${spot.name}` : `${capital(spot.name)}: obrim aviat`}
                data-place={spot.id}
                data-open={spot.open}
                whileTap={reduced ? undefined : { scale: 0.96 }}
                onClick={() => tapSpot(spot)}
                className="relative block h-full w-full rounded-[2rem] focus-visible:outline-8"
              >
                <Facade spot={spot} box={box} scale={scale} tint={i} />
                {!spot.open && <ClosedOverlay w={box.w} h={box.h} />}
              </motion.button>
            </li>
          )
        })}
        {layout.scenery.map((s) => (
          <li key={`${s.id}-${s.x}`} aria-hidden="true" className="pointer-events-none absolute bottom-0" style={{ left: s.x * scale, width: s.w * scale, height: s.h * scale }}>
            <PropArt id={s.id} size={s.h * scale} title="" />
          </li>
        ))}
      </motion.ul>
      <motion.div aria-hidden="true" style={{ x: front }} className="pointer-events-none absolute bottom-[3%] left-0 flex gap-[38vw] pl-[20vw]">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="block h-8 w-24 rounded-full" style={{ background: 'var(--world-grass, #a8d143)' }} />
        ))}
      </motion.div>
      <motion.div style={{ x: pan.x, width }} className="pointer-events-none absolute bottom-[6%] left-0 h-0">
        <StreetAvatar
          avatar={avatar}
          x={walk.x}
          scale={scale}
          size={avatarSize}
          walking={walk.walking}
          facing={walk.facing}
          entering={entering}
          reduced={reduced}
          greeting={greet ? greeting : undefined}
          holding={carrying}
        />
      </motion.div>
      <StreetArrow side="left" disabled={pan.atStart} onStep={() => stride(-1)} onHold={() => walk.hold(-1)} onRelease={walk.stop} />
      <StreetArrow side="right" disabled={pan.atEnd} onStep={() => stride(1)} onHold={() => walk.hold(1)} onRelease={walk.stop} />
      <Grain />
    </div>
  )
}
