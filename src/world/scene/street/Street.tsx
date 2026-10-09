import { motion, useTransform } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { unlockAudio } from '../../../core/audio/sfx'
import { speak } from '../../../core/audio/speech'
import type { AvatarSpec, SceneId } from '../../model/types'
import { Avatar, Grain, PropArt } from '../art'
import { useWorldReducedMotion } from '../useReducedMotion'
import { worldSfx } from '../worldSfx'
import { ClosedOverlay, FutureLot, Hills } from './StreetArt'
import { centreOf, layoutStreet, type LaidSpot } from './streetLayout'
import { useStreetPan, watchSize } from './useStreetPan'

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
  onEnter: (place: SceneId, from: DOMRect) => void
  /** Street offset to start at (remembered when coming back out of a place). */
  initialOffset?: number
  onOffsetChange?: (offset: number) => void
  /** «Vés-hi!» from the errand board: walk to that place, then go in. A new nonce = a new walk. */
  walkTo?: { id: SceneId; nonce: number }
  /** Speech bubble over her avatar («Hola, Laia!»), until she starts walking. */
  greeting?: string
}

const BUILDING_UNITS_H = 340
/** Time the walk takes before the door opens (none with reduced motion). */
export const WALK_MS = 650

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

export function Street({ avatar, spots, onEnter, initialOffset, onOffsetChange, walkTo, greeting }: StreetProps) {
  const reduced = useWorldReducedMotion()
  const [size, setSize] = useState({ w: 0, h: 640 })
  const layout = useMemo(() => layoutStreet(spots.map((s) => s.id)), [spots])
  const scale = scaleFor(size.h, size.w)
  const width = layout.length * scale
  const shop = layout.spots.find((s) => s.id === 'botiga') ?? layout.spots[0]
  const firstCentre = shop ? centreOf(shop) * scale : 0
  const pan = useStreetPan(width, reduced, initialOffset ?? 0)
  const back = useTransform(pan.x, (v) => v * 0.45)
  const front = useTransform(pan.x, (v) => v * 1.2)
  const first = useRef(initialOffset === undefined)
  const doors = useRef(new Map<SceneId, HTMLElement>())
  const [greet, setGreet] = useState(greeting !== undefined)

  useEffect(() => {
    const el = pan.viewportRef.current
    if (!el) return
    const measure = (): void => setSize({ w: el.clientWidth, h: el.clientHeight || 640 })
    measure()
    return watchSize(el, measure)
  }, [pan.viewportRef])

  // First visit: the shop in the middle of the screen.
  useEffect(() => {
    if (!first.current || pan.viewport === 0 || size.w === 0) return
    first.current = false
    pan.x.set(Math.max(pan.min, Math.min(0, pan.viewport / 2 - firstCentre)))
  }, [pan, firstCentre, size.w])

  useEffect(() => (onOffsetChange ? pan.x.on('change', onOffsetChange) : undefined), [pan.x, onOffsetChange])
  // The greeting stays until she walks (the street's own first centring on the shop does not count).
  const arrived = useRef(Date.now())
  useEffect(() => {
    if (!greet) return
    return pan.x.on('change', () => {
      if (Date.now() - arrived.current > 1200) setGreet(false)
    })
  }, [pan.x, greet])

  // «Vés-hi!»: walk to the place, then knock. Latest values in a ref so re-renders mid-walk never cancel it.
  const latest = useRef({ layout, scale, centreOn: pan.centreOn, onEnter, reduced })
  useEffect(() => {
    latest.current = { layout, scale, centreOn: pan.centreOn, onEnter, reduced }
  })
  useEffect(() => {
    if (!walkTo) return
    const now = latest.current
    const box = now.layout.spots.find((s) => s.id === walkTo.id)
    if (!box) return
    now.centreOn(centreOf(box) * now.scale)
    const timer = setTimeout(() => {
      const el = doors.current.get(walkTo.id)
      worldSfx.doorbell()
      latest.current.onEnter(walkTo.id, el ? el.getBoundingClientRect() : new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0))
    }, now.reduced ? 0 : WALK_MS)
    return () => clearTimeout(timer)
  }, [walkTo])

  const tapSpot = (spot: StreetSpot, el: HTMLElement): void => {
    unlockAudio()
    if (spot.open) {
      worldSfx.doorbell()
      onEnter(spot.id, el.getBoundingClientRect())
      return
    }
    worldSfx.boing()
    speak('Obrim aviat!')
  }

  const { viewportRef, handlers } = pan
  const avatarSize = Math.round(170 * scale)
  return (
    <div
      ref={viewportRef}
      {...handlers}
      data-testid="street"
      className="relative h-full w-full touch-pan-y overflow-hidden"
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
                onFocus={() => pan.centreOn(centreOf(box) * scale)}
                onClick={(e) => tapSpot(spot, e.currentTarget)}
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
      <div className="pointer-events-none absolute bottom-[4%] left-1/2 flex -translate-x-1/2 flex-col items-center">
        {greet && greeting && (
          <motion.p
            initial={reduced ? false : { scale: 0.6, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: reduced ? 0 : 0.35 }}
            className="relative mb-1 whitespace-nowrap rounded-[1.4rem] bg-white px-4 py-2 text-2xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-soft)]"
          >
            {greeting}
            <span aria-hidden="true" className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 rounded-sm bg-white" />
          </motion.p>
        )}
        <div aria-hidden="true">
          <Avatar spec={avatar} pose={greet && greeting ? 'wave' : 'idle'} look={{ x: pan.direction, y: 0 }} size={avatarSize} />
        </div>
      </div>
      <ArrowButton side="left" disabled={pan.atStart} onClick={() => pan.step(-1)} />
      <ArrowButton side="right" disabled={pan.atEnd} onClick={() => pan.step(1)} />
      <Grain />
    </div>
  )
}

function ArrowButton({ side, disabled, onClick }: { side: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Camina cap a l’esquerra' : 'Camina cap a la dreta'}
      disabled={disabled}
      onClick={() => {
        unlockAudio()
        worldSfx.whoosh()
        onClick()
      }}
      className={`absolute top-1/2 z-40 grid size-16 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-3xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)] transition-opacity active:scale-95 disabled:opacity-0 ${side === 'left' ? 'left-3' : 'right-3'}`}
    >
      <span aria-hidden="true">{side === 'left' ? '‹' : '›'}</span>
    </button>
  )
}
