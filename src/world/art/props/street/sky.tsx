import { INK, PALETTE } from '../../palette'
import type { PropDef } from '../types'

/** Sky: clouds and the smiling sun (floating, no ground shadow). */

export const nuvol: PropDef = {
  id: 'nuvol-cel',
  name: 'Núvol',
  group: 'cel',
  w: 180,
  h: 80,
  floating: true,
  render: () => (
    <g>
      <path d="M24 78 Q2 78 4 60 Q6 44 26 46 Q28 18 58 20 Q72 0 100 8 Q124 0 136 26 Q170 20 176 50 Q180 78 152 78 Z" fill={INK.white} />
      <path d="M24 78 Q10 78 8 68 Q60 74 176 62 Q174 78 152 78 Z" fill={PALETTE.cel.light} opacity={0.6} />
    </g>
  ),
}

export const sol: PropDef = {
  id: 'sol',
  name: 'Sol',
  group: 'cel',
  w: 150,
  h: 150,
  floating: true,
  render: () => (
    <g>
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={70} y={2} width={10} height={24} rx={5} fill={PALETTE.mango.base} transform={`rotate(${i * 36} 75 75)`} />
      ))}
      <circle cx={75} cy={75} r={44} fill={PALETTE.mango.base} />
      <circle cx={75} cy={75} r={36} fill={PALETTE.mango.light} />
      <path d="M58 72 q5 -6 10 0 M82 72 q5 -6 10 0" stroke={INK.face} strokeWidth={3.4} strokeLinecap="round" fill="none" />
      <path d="M66 84 q9 8 18 0" stroke={INK.face} strokeWidth={3.4} strokeLinecap="round" fill="none" />
      <ellipse cx={54} cy={84} rx={7} ry={4} fill={INK.blush} opacity={0.55} />
      <ellipse cx={96} cy={84} rx={7} ry={4} fill={INK.blush} opacity={0.55} />
    </g>
  ),
}

export const SKY: readonly PropDef[] = [nuvol, sol]
