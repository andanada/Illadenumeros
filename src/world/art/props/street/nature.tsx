import { PALETTE, swatch } from '../../palette'
import { blobPath } from '../../paths'
import type { PropDef } from '../types'

/** Street furniture: lamp, trees, bush and bench. */

export const fanal: PropDef = {
  id: 'fanal',
  name: 'Fanal',
  group: 'carrer',
  w: 64,
  h: 230,
  render: () => (
    <g>
      <rect x={26} y={56} width={12} height={168} rx={6} fill={PALETTE.carbo.base} />
      <rect x={18} y={214} width={28} height={16} rx={6} fill={PALETTE.carbo.shade} />
      <path d="M10 30 L54 30 L46 62 L18 62 Z" fill={PALETTE.mango.light} />
      <path d="M38 30 L54 30 L46 62 L38 62 Z" fill={PALETTE.mango.base} />
      <path d="M4 32 Q32 4 60 32 Z" fill={PALETTE.carbo.base} />
      <circle cx={32} cy={8} r={6} fill={PALETTE.carbo.base} />
      <rect x={14} y={60} width={36} height={8} rx={4} fill={PALETTE.carbo.base} />
    </g>
  ),
}

export const arbre: PropDef = {
  id: 'arbre',
  name: 'Arbre',
  group: 'carrer',
  w: 170,
  h: 240,
  recolourable: true,
  render: ({ color = 'llima' }) => {
    const c = swatch(color)
    return (
      <g>
        <path d="M74 240 L78 130 Q85 120 92 130 L96 240 Z" fill={PALETTE.xocolata.base} />
        <path d="M86 170 Q110 150 116 128" stroke={PALETTE.xocolata.base} strokeWidth={9} strokeLinecap="round" fill="none" />
        <path d={blobPath({ cx: 85, cy: 92, rx: 82, ry: 84, points: 9, wobble: 0.07, seed: 'arbre' })} fill={c.shade} />
        <path d={blobPath({ cx: 76, cy: 84, rx: 70, ry: 72, points: 9, wobble: 0.07, seed: 'arbre-llum' })} fill={c.base} />
        <path d={blobPath({ cx: 56, cy: 58, rx: 24, ry: 18, seed: 'arbre-brill' })} fill={c.light} opacity={0.8} />
        {[
          [110, 70],
          [46, 112],
          [96, 126],
        ].map(([x, y]) => (
          <circle key={`${x}`} cx={x} cy={y} r={6} fill={PALETTE.coral.base} />
        ))}
      </g>
    )
  },
}

export const pi: PropDef = {
  id: 'pi',
  name: 'Pi',
  group: 'carrer',
  w: 110,
  h: 230,
  render: () => (
    <g>
      <rect x={48} y={180} width={14} height={50} rx={5} fill={PALETTE.xocolata.base} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${55} ${10 + i * 52} Q104 ${96 + i * 52} ${100 + i * 4} ${118 + i * 52} Q55 ${130 + i * 52} ${10 - i * 4} ${118 + i * 52} Q${6} ${96 + i * 52} 55 ${10 + i * 52} Z`} fill={i % 2 ? PALETTE.menta.base : PALETTE.menta.shade} />
      ))}
    </g>
  ),
}

export const mata: PropDef = {
  id: 'mata',
  name: 'Mata',
  group: 'carrer',
  w: 120,
  h: 70,
  recolourable: true,
  render: ({ color = 'menta' }) => {
    const c = swatch(color)
    return (
      <g>
        <path d={blobPath({ cx: 60, cy: 44, rx: 58, ry: 30, points: 8, wobble: 0.1, seed: 'mata' })} fill={c.shade} />
        <path d={blobPath({ cx: 52, cy: 38, rx: 44, ry: 26, points: 8, wobble: 0.1, seed: 'mata-2' })} fill={c.base} />
        {[30, 58, 84].map((x, i) => (
          <circle key={x} cx={x} cy={26 + (i % 2) * 14} r={5} fill={i === 1 ? PALETTE.rosa.base : PALETTE.neu.base} />
        ))}
      </g>
    )
  },
}

export const banc: PropDef = {
  id: 'banc',
  name: 'Banc',
  group: 'carrer',
  w: 180,
  h: 90,
  recolourable: true,
  render: ({ color = 'coral' }) => {
    const c = swatch(color)
    return (
      <g>
        <rect x={10} y={0} width={160} height={18} rx={8} fill={c.base} />
        <rect x={10} y={24} width={160} height={18} rx={8} fill={c.base} />
        <rect x={0} y={46} width={180} height={18} rx={8} fill={c.base} />
        <rect x={0} y={58} width={180} height={6} rx={3} fill={c.shade} />
        {[22, 150].map((x) => (
          <g key={x}>
            <rect x={x} y={6} width={9} height={84} rx={4} fill={PALETTE.carbo.base} />
            <rect x={x - 6} y={84} width={21} height={6} rx={3} fill={PALETTE.carbo.shade} />
          </g>
        ))}
      </g>
    )
  },
}

/** Avatars sitting on the bench: put the avatar's ground (sit pose) at this y of the bench. */
export const BENCH_SEAT_Y = 52

export const NATURE: readonly PropDef[] = [fanal, arbre, pi, mata, banc]
