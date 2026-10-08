import { byId, type HairDef, type PartCtx } from './geometry'

/**
 * Hair styles. `back` sits behind the head (volume, long hair, pigtails), `front` over the forehead.
 * Two flat values only: shade for the back mass, base for the front, plus one light sheen stroke.
 * Head: centre (100, 96), rx 62, ry 56 → top at y 40, sides at x 38 / 162.
 */

const sheen = ({ c }: PartCtx, d = 'M70 50 Q86 40 104 40') => (
  <path d={d} stroke={c.light} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.75} />
)

/** Plain cap of hair down to the ears, used by several styles under their own fringe. */
const CAP = 'M37 104 C30 48 66 26 100 26 C134 26 170 48 163 104 C160 92 156 84 150 80 L50 80 C44 84 40 92 37 104 Z'

const curt: HairDef = {
  id: 'cabell-curt',
  name: 'Curt',
  front: (ctx) => (
    <g>
      <path d="M36 106 C28 46 68 24 104 26 C142 28 172 52 164 106 C160 88 152 76 142 70 C122 84 92 84 68 68 C56 76 44 88 36 106 Z" fill={ctx.c.base} />
      {sheen(ctx)}
    </g>
  ),
}

const bob: HairDef = {
  id: 'cabell-bob',
  name: 'Melena curta',
  back: ({ c }) => <path d="M28 100 C26 40 66 20 100 20 C134 20 174 40 172 100 L174 142 Q158 154 142 140 L58 140 Q42 154 26 142 Z" fill={c.shade} />,
  front: (ctx) => (
    <g>
      <path d="M34 112 C28 50 64 26 100 26 C136 26 172 50 166 112 C162 94 158 82 150 74 Q100 84 50 74 C42 82 38 94 34 112 Z" fill={ctx.c.base} />
      {sheen(ctx, 'M66 46 Q84 36 102 36')}
    </g>
  ),
}

const cues: HairDef = {
  id: 'cabell-cues',
  name: 'Cuetes',
  back: ({ c }) => (
    <g>
      <path d="M34 92 C8 96 4 140 16 158 C24 170 36 160 34 146 C32 128 40 108 44 98 Z" fill={c.shade} />
      <path d="M166 92 C192 96 196 140 184 158 C176 170 164 160 166 146 C168 128 160 108 156 98 Z" fill={c.shade} />
    </g>
  ),
  front: (ctx) => (
    <g>
      <path d="M36 104 C30 44 68 26 100 28 C132 26 170 44 164 104 C158 80 136 64 102 60 L98 60 C64 64 42 80 36 104 Z" fill={ctx.c.base} />
      <circle cx={40} cy={94} r={7} fill={ctx.c.light} />
      <circle cx={160} cy={94} r={7} fill={ctx.c.light} />
      {sheen(ctx, 'M70 44 Q82 38 94 36')}
    </g>
  ),
}

const cua: HairDef = {
  id: 'cabell-cua',
  name: 'Cua alta',
  back: ({ c }) => <path d="M140 44 C176 30 196 66 188 108 C182 140 170 164 158 172 C166 140 168 112 158 86 C152 72 144 62 132 56 Z" fill={c.shade} />,
  front: (ctx) => (
    <g>
      <path d="M36 104 C30 46 68 26 102 26 C138 26 170 48 164 104 C160 86 154 76 144 70 C130 66 112 72 96 70 C76 68 58 70 48 80 C42 86 38 94 36 104 Z" fill={ctx.c.base} />
      <ellipse cx={148} cy={46} rx={9} ry={7} fill={ctx.c.light} transform="rotate(-30 148 46)" />
      {sheen(ctx, 'M66 46 Q84 36 104 36')}
    </g>
  ),
}

const llarg: HairDef = {
  id: 'cabell-llarg',
  name: 'Llarg',
  back: ({ c }) => <path d="M30 98 C26 34 68 18 100 18 C132 18 174 34 170 98 L178 200 Q162 214 146 200 L54 200 Q38 214 22 200 Z" fill={c.shade} />,
  front: (ctx) => (
    <g>
      <path d="M34 120 C26 46 66 26 100 26 C134 26 174 46 166 120 C160 96 150 74 128 62 Q112 56 102 58 C96 70 72 72 58 72 C46 82 38 98 34 120 Z" fill={ctx.c.base} />
      {sheen(ctx, 'M64 48 Q80 36 98 34')}
    </g>
  ),
}

/** Cloud of curls: circles around the head, deterministic layout. */
const CURL_RING = Array.from({ length: 13 }, (_, i) => {
  const a = Math.PI * (0.92 + (i / 12) * 1.16)
  return { x: 100 + Math.cos(a) * 66, y: 92 + Math.sin(a) * 58, r: 22 + (i % 3) * 3 }
})

const arrissat: HairDef = {
  id: 'cabell-arrissat',
  name: 'Arrissat',
  back: ({ c }) => (
    <g fill={c.shade}>
      <ellipse cx={100} cy={86} rx={78} ry={66} />
      {CURL_RING.map((p) => (
        <circle key={`${p.x}`} cx={p.x} cy={p.y} r={p.r} />
      ))}
    </g>
  ),
  front: ({ c }) => (
    <g fill={c.base}>
      {[44, 62, 82, 102, 122, 140, 156].map((x, i) => (
        <circle key={x} cx={x} cy={58 + Math.abs(3 - i) * 5} r={16 + (i % 2) * 3} />
      ))}
      <ellipse cx={100} cy={46} rx={50} ry={20} />
      <circle cx={78} cy={46} r={5} fill={c.light} />
      <circle cx={120} cy={42} r={4} fill={c.light} />
    </g>
  ),
}

const monyo: HairDef = {
  id: 'cabell-monyo',
  name: 'Monyo',
  back: ({ c }) => (
    <g>
      <circle cx={100} cy={26} r={25} fill={c.shade} />
      <circle cx={92} cy={18} r={7} fill={c.base} opacity={0.6} />
    </g>
  ),
  front: (ctx) => (
    <g>
      <path d={CAP} fill={ctx.c.base} />
      <path d="M50 80 Q74 64 100 76 Q126 64 150 80 Z" fill={ctx.c.base} />
      {sheen(ctx, 'M66 46 Q84 34 104 34')}
    </g>
  ),
}

const BRAID = [0, 1, 2, 3, 4]
const trenes: HairDef = {
  id: 'cabell-trenes',
  name: 'Trenes',
  back: ({ c }) => (
    <g fill={c.shade}>
      {[-1, 1].map((s) =>
        BRAID.map((i) => <ellipse key={`${s}${i}`} cx={100 + s * (60 - i * 1.5)} cy={118 + i * 17} rx={12 - i * 0.8} ry={11} />),
      )}
      <circle cx={42} cy={204} r={6} fill={c.light} />
      <circle cx={158} cy={204} r={6} fill={c.light} />
    </g>
  ),
  front: (ctx) => (
    <g>
      <path d="M36 106 C30 46 68 26 100 26 C132 26 170 46 164 106 C160 84 146 68 104 62 L100 54 L96 62 C54 68 40 84 36 106 Z" fill={ctx.c.base} />
      {sheen(ctx, 'M64 50 Q78 38 92 36')}
    </g>
  ),
}

const punxes: HairDef = {
  id: 'cabell-punxes',
  name: 'Punxes',
  front: (ctx) => (
    <g>
      <path
        d="M38 104 C32 72 40 54 50 44 L44 22 L66 34 L72 10 L88 30 L100 6 L112 30 L128 10 L134 34 L156 22 L150 44 C160 54 168 72 162 104 C158 88 150 78 140 74 L126 82 L116 72 L100 82 L84 72 L74 82 L60 74 C50 78 42 88 38 104 Z"
        fill={ctx.c.base}
      />
      <path d="M82 36 L100 18 L104 34" stroke={ctx.c.light} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.8} />
    </g>
  ),
}

const rapat: HairDef = {
  id: 'cabell-rapat',
  name: 'Rapat',
  front: ({ c }) => (
    <g>
      <path d="M40 92 C40 56 68 36 100 36 C132 36 160 56 160 92 C152 76 136 66 100 64 C64 66 48 76 40 92 Z" fill={c.base} />
      <circle cx={80} cy={48} r={3} fill={c.light} />
      <circle cx={96} cy={44} r={3} fill={c.light} />
    </g>
  ),
}

export const HAIR: readonly HairDef[] = [curt, bob, cues, cua, llarg, arrissat, monyo, trenes, punxes, rapat]
export const HAIR_BY_ID = byId(HAIR)
