import { PALETTE } from '../../art/palette'
import { byId, type BottomDef, type PartCtx } from './geometry'

/**
 * Bottoms, drawn over the bare legs (body.tsx) and under the top. Lengths are fractions of the leg
 * so they follow the `sit` geometry automatically.
 */

const hips = ({ g, c }: PartCtx, drop = 16) => (
  <path d={`M66 ${g.hipY - 10} L134 ${g.hipY - 10} L136 ${g.hipY + drop} L64 ${g.hipY + drop} Z`} fill={c.base} />
)

/** Trouser legs covering `frac` of the leg length, `flare` px wider at the hem. */
function legs(ctx: PartCtx, frac: number, extra = 3, flare = 0) {
  const { g, c } = ctx
  const len = (g.footY - g.hipY) * frac
  const hw = g.legW / 2 + extra
  return [g.legL, g.legR].map((x, i) => (
    <g key={x}>
      <path d={`M${x - hw} ${g.hipY - 2} L${x + hw} ${g.hipY - 2} L${x + hw + flare} ${g.hipY + len} Q${x} ${g.hipY + len + 3} ${x - hw - flare} ${g.hipY + len} Z`} fill={c.base} />
      {i === 1 && <path d={`M${x + hw - 6} ${g.hipY} L${x + hw} ${g.hipY} L${x + hw + flare} ${g.hipY + len} L${x + hw - 6 + flare} ${g.hipY + len} Z`} fill={c.shade} opacity={0.6} />}
    </g>
  ))
}

const crotch = ({ g, c }: PartCtx) => <path d={`M96 ${g.hipY + 14} Q100 ${g.hipY + 22} 104 ${g.hipY + 14}`} stroke={c.shade} strokeWidth={3} fill="none" strokeLinecap="round" />

const pantalons: BottomDef = {
  id: 'pantalons',
  name: 'Pantalons',
  long: true,
  legs: (ctx) => (
    <g>
      {hips(ctx)}
      {legs(ctx, 0.88)}
      {crotch(ctx)}
    </g>
  ),
}

const texans: BottomDef = {
  id: 'texans',
  name: 'Texans',
  long: true,
  legs: (ctx) => {
    const { g, c } = ctx
    const hem = g.hipY + (g.footY - g.hipY) * 0.88
    return (
      <g>
        {hips(ctx)}
        {legs(ctx, 0.88)}
        {[g.legL, g.legR].map((x) => (
          <rect key={x} x={x - g.legW / 2 - 4} y={hem - 8} width={g.legW + 8} height={8} rx={3} fill={c.light} />
        ))}
        <path d={`M70 ${g.hipY - 1} L130 ${g.hipY - 1}`} stroke={c.light} strokeWidth={2} strokeDasharray="4 4" />
        <circle cx={100} cy={g.hipY - 4} r={2.6} fill={PALETTE.mango.base} />
        {crotch(ctx)}
      </g>
    )
  },
}

const curts: BottomDef = {
  id: 'pantalons-curts',
  name: 'Pantalons curts',
  legs: (ctx) => (
    <g>
      {hips(ctx)}
      {legs(ctx, 0.36, 5)}
    </g>
  ),
}

const bermudes: BottomDef = {
  id: 'bermudes',
  name: 'Bermudes',
  legs: (ctx) => (
    <g>
      {hips(ctx)}
      {legs(ctx, 0.56, 5, 2)}
      <path d={`M72 ${ctx.g.hipY + 12} l8 0 M120 ${ctx.g.hipY + 12} l8 0`} stroke={ctx.c.shade} strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
}

const faldilla: BottomDef = {
  id: 'faldilla',
  name: 'Faldilla',
  legs: ({ g, c }) => (
    <g>
      <path d={`M68 ${g.hipY - 10} L132 ${g.hipY - 10} L146 ${g.hipY + 28} Q100 ${g.hipY + 36} 54 ${g.hipY + 28} Z`} fill={c.base} />
      <path d={`M120 ${g.hipY - 10} L132 ${g.hipY - 10} L146 ${g.hipY + 28} Q138 ${g.hipY + 31} 130 ${g.hipY + 32} Z`} fill={c.shade} opacity={0.6} />
      <path d={`M84 ${g.hipY - 6} L78 ${g.hipY + 30} M100 ${g.hipY - 6} L100 ${g.hipY + 32} M116 ${g.hipY - 6} L122 ${g.hipY + 30}`} stroke={c.shade} strokeWidth={2.5} opacity={0.7} />
    </g>
  ),
}

const volants: BottomDef = {
  id: 'faldilla-volants',
  name: 'Faldilla de volants',
  legs: ({ g, c }) => (
    <g>
      <path d={`M60 ${g.hipY + 8} L140 ${g.hipY + 8} L150 ${g.hipY + 32} Q100 ${g.hipY + 40} 50 ${g.hipY + 32} Z`} fill={c.shade} />
      <path d={`M66 ${g.hipY - 10} L134 ${g.hipY - 10} L142 ${g.hipY + 14} Q100 ${g.hipY + 22} 58 ${g.hipY + 14} Z`} fill={c.base} />
      {[56, 76, 96, 116, 136].map((x) => (
        <circle key={x} cx={x + 4} cy={g.hipY + 32} r={4} fill={c.light} />
      ))}
    </g>
  ),
}

const peto: BottomDef = {
  id: 'peto',
  name: 'Pitet',
  long: true,
  legs: (ctx) => (
    <g>
      {hips(ctx)}
      {legs(ctx, 0.84)}
      {crotch(ctx)}
    </g>
  ),
  over: ({ g, c }) => {
    const t = g.torsoTop + g.lift
    return (
      <g>
        <path d={`M80 ${t + 30} L120 ${t + 30} L122 ${g.hipY} L78 ${g.hipY} Z`} fill={c.base} />
        <rect x={90} y={t + 38} width={20} height={14} rx={4} fill={c.shade} />
        <path d={`M80 ${t + 32} L76 ${t + 2} M120 ${t + 32} L124 ${t + 2}`} stroke={c.base} strokeWidth={7} strokeLinecap="round" />
        <circle cx={82} cy={t + 32} r={3.4} fill={PALETTE.mango.base} />
        <circle cx={118} cy={t + 32} r={3.4} fill={PALETTE.mango.base} />
      </g>
    )
  },
}

const malles: BottomDef = {
  id: 'malles',
  name: 'Malles',
  long: true,
  legs: (ctx) => (
    <g>
      {hips(ctx, 10)}
      {legs(ctx, 0.9, 1)}
      {[ctx.g.legL, ctx.g.legR].map((x) =>
        [0.3, 0.55, 0.8].map((f) => <circle key={`${x}${f}`} cx={x} cy={ctx.g.hipY + (ctx.g.footY - ctx.g.hipY) * f} r={2.6} fill={ctx.c.light} />),
      )}
    </g>
  ),
}

const campana: BottomDef = {
  id: 'pantalons-campana',
  name: 'Pantalons de campana',
  long: true,
  legs: (ctx) => (
    <g>
      {hips(ctx)}
      {legs(ctx, 0.9, 2, 7)}
      {crotch(ctx)}
    </g>
  ),
}

export const BOTTOMS: readonly BottomDef[] = [pantalons, texans, curts, bermudes, faldilla, volants, peto, malles, campana]
export const BOTTOMS_BY_ID = byId(BOTTOMS)
