import { memo, useId, type ReactNode } from 'react'
import { skin as skinSwatch, swatch } from '../art/palette'
import { Shadow } from '../art/primitives'
import { hashSeed } from '../art/random'
import type { AvatarSpec } from '../model/types'
import { Arm, Blush, Head, Knees, Legs, Neck } from './kit/body'
import { ARM_ANGLES, AVATAR_CROPS, GROUND_Y, geometryFor, SHOULDER_L, SHOULDER_R, type AvatarCrop, type Look, type PartCtx, type Pose } from './kit/geometry'
import { resolveSpec } from './resolveSpec'
import { useBlink, useCalm } from './useBlink'

export interface AvatarProps {
  spec: AvatarSpec
  /** idle (default) · wave · cheer · hold · sit */
  pose?: Pose
  /** Gaze direction, each axis -1..1 (use lookToward() to compute it from a pointer). */
  look?: Look
  /** SVG content drawn upright in the right hand, centred on (0, 0), about 44 px wide. Best with pose 'hold'. */
  holding?: ReactNode
  /** Rendered height in px (width = height × 0.6875). Default 240. */
  size?: number
  /** 0.9–1.25: taller grown-ups for neighbours. Default 1. */
  stature?: number
  /** Breathing, blinking and pose loops. Default true; always off with prefers-reduced-motion. */
  animated?: boolean
  /** Accessible name. Without it the avatar is decorative (aria-hidden). */
  title?: string
  className?: string
  /** Desynchronises blink/breath timing between several people. */
  seed?: string
  /** Zoom on one region (creator thumbnails). `size` is then the height of that region. */
  crop?: AvatarCrop
}


const NO_LOOK: Look = { x: 0, y: 0 }


const LOOPS: Partial<Record<Pose, { l?: string; r?: string }>> = {
  wave: { r: 'world-wave' },
  cheer: { l: 'world-cheer', r: 'world-cheer' },
}

export const Avatar = memo(function Avatar({
  spec,
  pose = 'idle',
  look = NO_LOOK,
  holding,
  size = 240,
  stature = 1,
  animated = true,
  title,
  className,
  seed = 'avatar',
  crop,
}: AvatarProps) {
  const uid = useId().replace(/:/g, '')
  const calm = useCalm()
  const live = animated && !calm
  const blink = useBlink(animated, seed)
  const s = resolveSpec(spec)
  const g = geometryFor(pose)
  const skin = skinSwatch(s.skin)
  const ctx = (color: AvatarSpec['top']['color']): PartCtx => ({ c: swatch(color), skin, g, uid })
  const top = s.top.def
  const bottom = s.bottom.def
  const shoes = s.shoes.def
  const hair = s.hair.def
  const topCtx = ctx(s.top.color)
  const hairCtx = ctx(s.hair.color)
  const bottomCtx = ctx(s.bottom.color)
  const shoeCtx = ctx(s.shoes.color)
  const accCtx = s.accessory ? ctx(s.accessory.color) : null
  const st = Math.max(0.85, Math.min(1.3, stature))
  const headRise = -(st - 1) * 138 + g.lift
  const bodyScale = `translate(0 ${GROUND_Y * (1 - st)}) scale(1 ${st})`
  const angles = ARM_ANGLES[pose]
  const loops = live ? LOOPS[pose] : undefined
  const delay = `${-(hashSeed(seed) % 3400)}ms`
  const faceShift = `translate(${look.x * 3} ${look.y * 2})`
  const top0 = -22 + Math.min(0, -(st - 1) * 138)
  const face = { look, blink }

  const box = crop ? AVATAR_CROPS[crop] : ([-10, top0, 220, GROUND_Y + 12 - top0] as const)

  return (
    <svg
      viewBox={box.join(' ')}
      height={size}
      width={(size * box[2]) / box[3]}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-pose={pose}
      style={{ overflow: crop ? 'hidden' : 'visible' }}
    >
      <Shadow cx={100} cy={GROUND_Y} rx={pose === 'sit' ? 58 : 50} long={44} />
      <g className={live ? 'world-breathe' : undefined} style={{ animationDelay: delay }}>
        <g transform={`translate(0 ${headRise})`}>
          {hair.back?.(hairCtx)}
          {s.accessory && accCtx && s.accessory.def.back?.(accCtx)}
        </g>
        <g transform={bodyScale}>
          <Legs g={g} skin={skin} />
          {bottom.legs(bottomCtx)}
          {shoes.foot(shoeCtx, g.legL - 2, g.footY + 10, -1)}
          {shoes.foot(shoeCtx, g.legR + 2, g.footY + 10, 1)}
          <Neck g={g} skin={skin} />
          {top.body(topCtx)}
          {bottom.over?.(bottomCtx)}
          {pose === 'sit' && true && (
            <Knees g={g} fill={top.long ? topCtx.c.base : bottomCtx.c.base} shade={top.long ? topCtx.c.shade : bottomCtx.c.shade} />
          )}
          <Arm x={SHOULDER_L.x} y={SHOULDER_L.y + g.lift} angle={angles.l} skin={skin} sleeve={top.sleeve} cloth={topCtx.c} loop={loops?.l} />
          <Arm x={SHOULDER_R.x} y={SHOULDER_R.y + g.lift} angle={angles.r} skin={skin} sleeve={top.sleeve} cloth={topCtx.c} loop={loops?.r} holding={holding} />
        </g>
        <g transform={`translate(0 ${headRise})`}>
          {top.back?.(topCtx)}
          <g className={live ? 'world-bob' : undefined} style={{ animationDelay: delay }}>
            <Head skin={skin} />
            <g transform={faceShift}>
              {s.eyes.render(face)}
              <Blush look={look} />
              {s.mouth.render(face)}
            </g>
            {hair.front(hairCtx)}
            {s.accessory && accCtx && s.accessory.def.front(accCtx)}
          </g>
        </g>
      </g>
    </svg>
  )
})
