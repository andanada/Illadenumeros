import { memo } from 'react'
import { INK } from '../../art/palette'
import { blobPath, sparklePath } from '../../art/paths'
import { Shadow } from '../../art/primitives'
import type { Look } from '../kit/geometry'
import { useBlink, useCalm } from '../useBlink'
import { PETS, type PetDef, type PetId, type PetPose } from './petDefs'

export interface PetProps {
  id: PetId
  /** idle (default) · happy (hops, smiling eyes) · sleep (curled, zZ) */
  pose?: PetPose
  look?: Look
  /** Rendered height in px (width = height × 160/150). Default 120. */
  size?: number
  animated?: boolean
  /** Accessible name; defaults to the pet's name. Pass '' to make it decorative. */
  title?: string
  className?: string
}

const HEAD = { cx: 66, cy: 74 }
const GROUND = 142

function EarsBack({ p }: { p: PetDef }) {
  switch (p.ears) {
    case 'bunny-long':
    case 'bunny-pink': {
      const flop = p.ears === 'bunny-pink' ? 38 : 8
      return (
        <g>
          <g transform="rotate(-14 50 46)">
            <ellipse cx={50} cy={20} rx={12} ry={32} fill={p.furShade} />
            <ellipse cx={50} cy={22} rx={5.5} ry={22} fill={p.inner} />
          </g>
          <g transform={`rotate(${flop} 84 44)`}>
            <ellipse cx={84} cy={18} rx={12} ry={32} fill={p.fur} />
            <ellipse cx={84} cy={20} rx={5.5} ry={22} fill={p.inner} />
          </g>
        </g>
      )
    }
    case 'cat':
      return (
        <g>
          <path d="M28 64 L32 22 L60 44 Z" fill={p.furShade} />
          <path d="M104 62 L100 20 L72 42 Z" fill={p.fur} />
          <path d="M36 52 L38 32 L52 44 Z" fill={p.inner} />
          <path d="M96 50 L94 30 L80 42 Z" fill={p.inner} />
        </g>
      )
    case 'dog-flop':
      return null
    case 'cloud':
      return (
        <g fill={p.furShade}>
          {[
            [28, 52, 16],
            [44, 38, 17],
            [66, 32, 18],
            [88, 38, 17],
            [104, 54, 16],
          ].map(([x, y, r]) => (
            <circle key={`${x}`} cx={x} cy={y} r={r} />
          ))}
        </g>
      )
  }
}

function EarsFront({ p }: { p: PetDef }) {
  switch (p.ears) {
    case 'bunny-long':
      return <path d={sparklePath(92, 50, 9, 0.34)} fill={p.accent} />
    case 'cat':
      return (
        <g transform="translate(96 44) rotate(18)">
          <path d="M0 0 C-6 -12 -22 -10 -20 2 C-18 12 -6 8 0 0 Z M0 0 C6 -12 22 -10 20 2 C18 12 6 8 0 0 Z" fill={p.accent} />
          <circle r={5} fill={INK.white} opacity={0.5} />
        </g>
      )
    case 'dog-flop':
      return (
        <g>
          <path d="M30 50 C14 52 10 86 20 98 C30 100 36 80 40 62 Z" fill={p.furShade} />
          <path d="M102 50 C118 52 122 86 112 98 C102 100 96 80 92 62 Z" fill={p.furShade} />
          <ellipse cx={82} cy={70} rx={14} ry={12} fill={p.furShade} opacity={0.5} />
        </g>
      )
    case 'bunny-pink':
      return (
        <g transform="translate(36 50)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse key={deg} cx={0} cy={-7} rx={5.5} ry={7.5} fill={INK.white} transform={`rotate(${deg})`} />
          ))}
          <circle r={4.5} fill={p.accent} />
        </g>
      )
    case 'cloud':
      return <path d="M100 32 q6 10 0 14 q-6 -4 0 -14 Z" fill={p.accent} />
  }
}

function Tail({ p }: { p: PetDef }) {
  switch (p.tail) {
    case 'pompom':
      return <circle cx={132} cy={104} r={13} fill={p.belly} />
    case 'cat':
      return <path d="M124 112 C146 108 150 80 140 70 C134 64 128 70 134 76 C140 86 134 100 122 102 Z" fill={p.furShade} />
    case 'wag':
      return <path d="M124 104 C138 100 144 86 142 78 C148 82 150 96 140 108 C134 114 126 112 124 104 Z" fill={p.furShade} />
    case 'cloud':
      return (
        <g fill={p.furShade}>
          <circle cx={130} cy={100} r={11} />
          <circle cx={140} cy={90} r={9} />
        </g>
      )
  }
}

function Face({ p, look, blink, pose }: { p: PetDef; look: Look; blink: boolean; pose: PetPose }) {
  const dx = look.x * 4
  const dy = look.y * 3
  const shut = pose === 'sleep' || blink
  const ink = p.eye ?? INK.face
  const glint = p.eye ? p.accent : INK.white
  return (
    <g>
      {[50, 82].map((x) =>
        pose === 'happy' ? (
          <path key={x} d={`M${x - 6} 80 Q${x} 71 ${x + 6} 80`} stroke={ink} strokeWidth={3.4} strokeLinecap="round" fill="none" />
        ) : shut ? (
          <path key={x} d={`M${x - 6} 77 Q${x} 82 ${x + 6} 77`} stroke={ink} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        ) : (
          <g key={x}>
            <ellipse cx={x + dx} cy={76 + dy} rx={5.6} ry={6.6} fill={ink} />
            <circle cx={x + dx + 1.8} cy={73.4 + dy} r={1.8} fill={glint} />
          </g>
        ),
      )}
      <ellipse cx={38} cy={90} rx={8} ry={5} fill={INK.blush} opacity={0.5} />
      <ellipse cx={94} cy={90} rx={8} ry={5} fill={INK.blush} opacity={0.5} />
      <ellipse cx={66 + dx * 0.5} cy={87} rx={5} ry={3.6} fill={p.nose} />
      <path d={`M60 93 Q63 97 66 93 Q69 97 72 93`} stroke={ink} strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </g>
  )
}

export const Pet = memo(function Pet({ id, pose = 'idle', look = { x: 0, y: 0 }, size = 120, animated = true, title, className }: PetProps) {
  const p = PETS[id]
  const calm = useCalm()
  const blink = useBlink(animated && pose === 'idle', `pet-${id}`)
  const live = animated && !calm
  const label = title ?? p.name
  const loop = live ? (pose === 'happy' ? 'world-hop' : pose === 'idle' ? 'world-breathe' : undefined) : undefined
  return (
    <svg
      viewBox="0 0 160 150"
      height={size}
      width={(size * 160) / 150}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      data-pet={id}
      style={{ overflow: 'visible' }}
    >
      <Shadow cx={86} cy={GROUND} rx={50} long={30} />
      <g className={loop} style={loop === 'world-breathe' ? { transformOrigin: '86px 142px' } : undefined}>
        <Tail p={p} />
        {[64, 108].map((x) => (
          <ellipse key={x} cx={x + 6} cy={GROUND - 4} rx={10} ry={7} fill={p.furShade} />
        ))}
        <path d={blobPath({ cx: 88, cy: 112, rx: 46, ry: 28, wobble: 0.04, seed: `body-${id}` })} fill={p.fur} />
        <ellipse cx={84} cy={120} rx={24} ry={15} fill={p.belly} />
        {[56, 96].map((x) => (
          <ellipse key={x} cx={x} cy={GROUND - 2} rx={10} ry={7} fill={p.fur} />
        ))}
        {p.ears === 'dog-flop' && <rect x={40} y={102} width={52} height={9} rx={4.5} fill={p.accent} />}
        <EarsBack p={p} />
        <path d={blobPath({ cx: HEAD.cx, cy: HEAD.cy, rx: 42, ry: 37, wobble: 0.035, points: 8, seed: `head-${id}` })} fill={p.fur} />
        <path d="M96 56 C112 76 104 104 80 110 C98 96 102 76 96 56 Z" fill={p.furShade} opacity={0.4} />
        <Face p={p} look={look} blink={blink} pose={pose} />
        <EarsFront p={p} />
        {pose === 'sleep' && (
          <g fill={INK.face} opacity={0.55} fontFamily="var(--font-display)" fontWeight={700}>
            <text x={112} y={44} fontSize={18}>z</text>
            <text x={126} y={28} fontSize={13}>z</text>
          </g>
        )}
      </g>
    </svg>
  )
})
