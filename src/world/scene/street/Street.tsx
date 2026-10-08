import { motion, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { unlockAudio } from '../../../core/audio/sfx'
import { speak } from '../../../core/audio/speech'
import type { AvatarSpec } from '../../model/types'
import { Avatar, Grain, PropArt } from '../art'
import { useWorldReducedMotion } from '../useReducedMotion'
import { worldSfx } from '../worldSfx'
import { ClosedOverlay, Hills } from './StreetArt'
import { useStreetPan, watchSize } from './useStreetPan'

export type StreetPlaceId = 'botiga' | 'casa' | 'autobus'

interface Spot {
  id: StreetPlaceId
  name: string
  open: boolean
  /** Art library prop of the façade. */
  art: string
  /** Left edge, width and height in street units (1 unit ≈ 1 px at scale 1). */
  x: number
  w: number
  h: number
}

export const STREET_SPOTS: readonly Spot[] = [
  { id: 'casa', name: 'la Casa', open: false, art: 'facana-casa', x: 150, w: 260, h: 330 },
  { id: 'botiga', name: 'la Botiga', open: true, art: 'facana-botiga', x: 560, w: 320, h: 330 },
  { id: 'autobus', name: 'la parada de l’Autobús', open: false, art: 'parada-autobus', x: 1080, w: 260, h: 270 },
]

const SCENERY = [
  { x: 20, w: 110, h: 230, id: 'pi' },
  { x: 440, w: 64, h: 230, id: 'fanal' },
  { x: 900, w: 170, h: 240, id: 'arbre' },
  { x: 1370, w: 180, h: 90, id: 'banc' },
  { x: 1560, w: 120, h: 70, id: 'mata' },
  { x: 1600, w: 110, h: 230, id: 'pi' },
] as const

const STREET_UNITS = 1720
const BUILDING_UNITS_H = 340

export interface StreetProps {
  avatar: AvatarSpec
  onEnter: (place: StreetPlaceId, from: DOMRect) => void
  /** Street offset to start at (remembered when coming back out of a place). */
  initialOffset?: number
  onOffsetChange?: (offset: number) => void
}

/** Building scale from the available height: big on tablets, still whole on a phone. */
const scaleFor = (height: number, width: number): number => Math.max(0.55, Math.min(1.15, (height * 0.55) / BUILDING_UNITS_H, width > 0 ? width / 400 : 1.15))

export function Street({ avatar, onEnter, initialOffset, onOffsetChange }: StreetProps) {
  const reduced = useWorldReducedMotion()
  const [size, setSize] = useState({ w: 0, h: 640 })
  const scale = scaleFor(size.h, size.w)
  const width = STREET_UNITS * scale
  const botigaCentre = (560 + 160) * scale
  const pan = useStreetPan(width, reduced, initialOffset ?? 0)
  const back = useTransform(pan.x, (v) => v * 0.45)
  const front = useTransform(pan.x, (v) => v * 1.2)
  const first = useRef(initialOffset === undefined)

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
    pan.x.set(Math.max(pan.min, Math.min(0, pan.viewport / 2 - botigaCentre)))
  }, [pan, botigaCentre, size.w])

  useEffect(() => (onOffsetChange ? pan.x.on('change', onOffsetChange) : undefined), [pan.x, onOffsetChange])

  const tapSpot = (spot: Spot, el: HTMLElement): void => {
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
        {STREET_SPOTS.map((spot) => (
          <li key={spot.id} className="absolute bottom-0" style={{ left: spot.x * scale, width: spot.w * scale, height: spot.h * scale }}>
            <motion.button
              type="button"
              aria-label={spot.open ? `Entra a ${spot.name}` : `${spot.name.replace(/^la /, 'La ')}: obrim aviat`}
              data-place={spot.id}
              whileTap={reduced ? undefined : { scale: 0.96 }}
              onFocus={() => pan.centreOn((spot.x + spot.w / 2) * scale)}
              onClick={(e) => tapSpot(spot, e.currentTarget)}
              className="relative block h-full w-full rounded-[2rem] focus-visible:outline-8"
            >
              <PropArt id={spot.art} size={spot.h * scale} title="" shadow={false} className="block" />
              {!spot.open && <ClosedOverlay w={spot.w} h={spot.h} />}
            </motion.button>
          </li>
        ))}
        {SCENERY.map((s) => (
          <li key={`${s.id}-${s.x}`} aria-hidden="true" className="pointer-events-none absolute bottom-0" style={{ left: s.x * scale, width: s.w * scale, height: s.h * scale }}>
            <PropArt id={s.id} size={s.h * scale} title="" />
          </li>
        ))}
      </motion.ul>
      <motion.div aria-hidden="true" style={{ x: front }} className="pointer-events-none absolute bottom-[3%] left-0 flex gap-[38vw] pl-[20vw]">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="block h-8 w-24 rounded-full" style={{ background: 'var(--world-grass, #a8d143)' }} />
        ))}
      </motion.div>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[4%] left-1/2 -translate-x-1/2">
        <Avatar spec={avatar} pose="idle" look={{ x: pan.direction, y: 0 }} size={Math.round(170 * scale)} />
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
