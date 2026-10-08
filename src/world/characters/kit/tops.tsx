import type { ReactNode } from 'react'
import { PALETTE } from '../../art/palette'
import { sparklePath } from '../../art/paths'
import { byId, torsoPath, type PartCtx, type TopDef } from './geometry'

/**
 * Tops. The torso is the shared soft trapezoid (geometry.torsoPath); sleeves are painted by the arms
 * using `sleeve`. Prints use a contrast ink from printOn() so every colour stays readable.
 */

const cream = PALETTE.neu.base
const yTop = ({ g }: PartCtx) => g.torsoTop + g.lift
const yBot = ({ g }: PartCtx) => g.torsoBottom + g.lift

/** Flat shade on the right flank: the house "light from the upper left" cue. */
const flank = (ctx: PartCtx, flare = 0) => (
  <path d={`M118 ${yTop(ctx) + 6} Q134 ${yTop(ctx) + 4} ${132 + flare} ${yBot(ctx) - 6} L${128 + flare} ${yBot(ctx) + flare * 0.4} L120 ${yBot(ctx) + flare * 0.4} Q126 ${yTop(ctx) + 40} 118 ${yTop(ctx) + 6} Z`} fill={ctx.c.shade} opacity={0.55} />
)

const tee = (ctx: PartCtx) => (
  <g>
    <path d={torsoPath(ctx.g)} fill={ctx.c.base} />
    {flank(ctx)}
    <path d={`M88 ${yTop(ctx)} Q100 ${yTop(ctx) + 12} 112 ${yTop(ctx)} Z`} fill={ctx.c.shade} />
  </g>
)

const withPrint = (draw: (ctx: PartCtx, y: number) => ReactNode) => (ctx: PartCtx) => (
  <g>
    {tee(ctx)}
    {draw(ctx, yTop(ctx) + 36)}
  </g>
)

const ratlles = (ctx: PartCtx) => {
  const id = `${ctx.uid}-stripes`
  const t = yTop(ctx)
  return (
    <g>
      <clipPath id={id}>
        <path d={torsoPath(ctx.g)} />
      </clipPath>
      {tee(ctx)}
      <g clipPath={`url(#${id})`} fill={ctx.c === PALETTE.neu ? PALETTE.cel.base : cream}>
        {[16, 32, 48, 64].map((dy) => (
          <rect key={dy} x={60} y={t + dy} width={80} height={7} />
        ))}
      </g>
    </g>
  )
}

const hoodie: TopDef = {
  id: 'dessuadora',
  name: 'Dessuadora',
  sleeve: 'long',
  back: (ctx) => <path d={`M62 ${yTop(ctx) + 10} Q60 ${yTop(ctx) - 30} 100 ${yTop(ctx) - 32} Q140 ${yTop(ctx) - 30} 138 ${yTop(ctx) + 10} Z`} fill={ctx.c.shade} />,
  body: (ctx) => (
    <g>
      <path d={torsoPath(ctx.g)} fill={ctx.c.base} />
      {flank(ctx)}
      <path d={`M80 ${yBot(ctx) - 30} L120 ${yBot(ctx) - 30} Q124 ${yBot(ctx) - 12} 116 ${yBot(ctx) - 10} L84 ${yBot(ctx) - 10} Q76 ${yBot(ctx) - 12} 80 ${yBot(ctx) - 30} Z`} fill={ctx.c.shade} />
      <path d={`M92 ${yTop(ctx) + 6} l-2 18 M108 ${yTop(ctx) + 6} l2 18`} stroke={ctx.c.light} strokeWidth={3} strokeLinecap="round" />
      <circle cx={90} cy={yTop(ctx) + 26} r={3} fill={ctx.c.light} />
      <circle cx={110} cy={yTop(ctx) + 26} r={3} fill={ctx.c.light} />
    </g>
  ),
}

const jersei: TopDef = {
  id: 'jersei',
  name: 'Jersei',
  sleeve: 'long',
  body: (ctx) => (
    <g>
      <path d={torsoPath(ctx.g)} fill={ctx.c.base} />
      {flank(ctx)}
      <rect x={67} y={yBot(ctx) - 10} width={66} height={10} rx={5} fill={ctx.c.shade} />
      <path d={`M84 ${yTop(ctx) - 2} Q100 ${yTop(ctx) + 16} 116 ${yTop(ctx) - 2}`} stroke={ctx.c.shade} strokeWidth={8} strokeLinecap="round" fill="none" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${84 + i * 16} ${yTop(ctx) + 40} l6 6 l6 -6`} stroke={ctx.c.light} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  ),
}

const camisa: TopDef = {
  id: 'camisa',
  name: 'Camisa',
  sleeve: 'short',
  body: (ctx) => (
    <g>
      <path d={torsoPath(ctx.g)} fill={ctx.c.base} />
      {flank(ctx)}
      <path d={`M100 ${yTop(ctx) + 4} L100 ${yBot(ctx)}`} stroke={ctx.c.shade} strokeWidth={2.5} />
      {[22, 38, 54].map((dy) => (
        <circle key={dy} cx={100} cy={yTop(ctx) + dy} r={2.6} fill={ctx.c.light} />
      ))}
      <path d={`M82 ${yTop(ctx) - 2} L100 ${yTop(ctx) + 8} L94 ${yTop(ctx) + 18} Z M118 ${yTop(ctx) - 2} L100 ${yTop(ctx) + 8} L106 ${yTop(ctx) + 18} Z`} fill={cream} />
    </g>
  ),
}

const tirants: TopDef = {
  id: 'tirants',
  name: 'Samarreta de tirants',
  sleeve: 'none',
  body: (ctx) => (
    <g>
      <path d={torsoPath(ctx.g)} fill={ctx.c.base} />
      {flank(ctx)}
      <path d={`M80 ${yTop(ctx) + 8} Q100 ${yTop(ctx) + 30} 120 ${yTop(ctx) + 8} L120 ${yTop(ctx)} L80 ${yTop(ctx)} Z`} fill={ctx.skin.base} />
      <path d={`M80 ${yTop(ctx) + 8} Q100 ${yTop(ctx) + 30} 120 ${yTop(ctx) + 8}`} stroke={ctx.c.shade} strokeWidth={4} fill="none" />
    </g>
  ),
}

const jaqueta: TopDef = {
  id: 'jaqueta',
  name: 'Jaqueta',
  sleeve: 'long',
  body: (ctx) => (
    <g>
      <path d={torsoPath(ctx.g)} fill={ctx.c.base} />
      <path d={`M92 ${yTop(ctx)} L108 ${yTop(ctx)} L106 ${yBot(ctx)} L94 ${yBot(ctx)} Z`} fill={cream} />
      {flank(ctx)}
      <path d={`M86 ${yTop(ctx) - 2} L96 ${yTop(ctx) + 30} L86 ${yTop(ctx) + 26} Z M114 ${yTop(ctx) - 2} L104 ${yTop(ctx) + 30} L114 ${yTop(ctx) + 26} Z`} fill={ctx.c.shade} />
      <rect x={74} y={yBot(ctx) - 26} width={14} height={4} rx={2} fill={ctx.c.shade} />
      <rect x={112} y={yBot(ctx) - 26} width={14} height={4} rx={2} fill={ctx.c.shade} />
    </g>
  ),
}

const vestit: TopDef = {
  id: 'vestit',
  name: 'Vestit',
  sleeve: 'short',
  long: true,
  body: (ctx) => (
    <g>
      <path d={torsoPath(ctx.g, 16)} fill={ctx.c.base} />
      <path d={`M60 ${yBot(ctx) + 4} Q100 ${yBot(ctx) + 14} 140 ${yBot(ctx) + 4} L148 ${yBot(ctx) + 26} Q100 ${yBot(ctx) + 38} 52 ${yBot(ctx) + 26} Z`} fill={ctx.c.base} />
      <path d={`M128 ${yBot(ctx) + 4} L148 ${yBot(ctx) + 26} Q140 ${yBot(ctx) + 30} 132 ${yBot(ctx) + 31} Z`} fill={ctx.c.shade} opacity={0.6} />
      {flank(ctx)}
      <rect x={68} y={yTop(ctx) + 40} width={64} height={8} rx={4} fill={ctx.c.shade} />
      {[70, 90, 110, 130].map((x) => (
        <circle key={x} cx={x} cy={yBot(ctx) + 18} r={3} fill={ctx.c.light} />
      ))}
    </g>
  ),
}

const impermeable: TopDef = {
  id: 'impermeable',
  name: 'Impermeable',
  sleeve: 'long',
  long: true,
  back: hoodie.back,
  body: (ctx) => (
    <g>
      <path d={torsoPath(ctx.g, 8)} fill={ctx.c.base} />
      <path d={`M64 ${yBot(ctx)} L136 ${yBot(ctx)} L140 ${yBot(ctx) + 22} Q100 ${yBot(ctx) + 28} 60 ${yBot(ctx) + 22} Z`} fill={ctx.c.base} />
      {flank(ctx, 6)}
      <path d={`M100 ${yTop(ctx) + 2} L100 ${yBot(ctx) + 26}`} stroke={ctx.c.shade} strokeWidth={3} />
      {[20, 40, 60].map((dy) => (
        <rect key={dy} x={94} y={yTop(ctx) + dy} width={12} height={4} rx={2} fill={cream} />
      ))}
    </g>
  ),
}

const heart = (_: PartCtx, y: number) => (
  <path d={`M100 ${y + 10} C86 ${y} 88 ${y - 12} 100 ${y - 4} C112 ${y - 12} 114 ${y} 100 ${y + 10} Z`} fill={cream} />
)
const star = (ctx: PartCtx, y: number) => <path d={sparklePath(100, y - 2, 13, 0.36)} fill={ctx.c === PALETTE.mango ? PALETTE.coral.base : PALETTE.mango.base} />

export const TOPS: readonly TopDef[] = [
  { id: 'samarreta', name: 'Samarreta', sleeve: 'short', body: tee },
  { id: 'samarreta-ratlles', name: 'Samarreta de ratlles', sleeve: 'short', body: ratlles },
  { id: 'samarreta-estel', name: 'Samarreta estel', sleeve: 'short', body: withPrint(star) },
  { id: 'samarreta-cor', name: 'Samarreta cor', sleeve: 'short', body: withPrint(heart) },
  hoodie,
  jersei,
  camisa,
  tirants,
  jaqueta,
  vestit,
  impermeable,
]
export const TOPS_BY_ID = byId(TOPS)
