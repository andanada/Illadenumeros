import { PALETTE } from '../../palette'
import { SVG_TEXT, type PropDef } from '../types'

/** Groceries for the Botiga: fruit, bread and milk. Small (≈ 44–90 px), readable at a glance. */

const leaf = (x: number, y: number, rot: number) => (
  <path d={`M${x} ${y} q8 -10 18 -6 q-6 10 -18 6 Z`} fill={PALETTE.llima.base} transform={`rotate(${rot} ${x} ${y})`} />
)

export const poma: PropDef = {
  id: 'poma',
  name: 'Poma',
  group: 'botiga',
  w: 48,
  h: 50,
  render: () => (
    <g>
      <path d="M24 14 C10 4 0 18 2 30 C4 44 14 50 24 46 C34 50 44 44 46 30 C48 18 38 4 24 14 Z" fill={PALETTE.coral.base} />
      <path d="M36 14 C46 22 46 38 36 46 C42 36 42 24 36 14 Z" fill={PALETTE.coral.shade} />
      <ellipse cx={13} cy={22} rx={4} ry={6} fill={PALETTE.coral.light} transform="rotate(20 13 22)" />
      <rect x={22} y={4} width={4} height={12} rx={2} fill={PALETTE.xocolata.base} />
      {leaf(26, 10, -10)}
    </g>
  ),
}

export const platan: PropDef = {
  id: 'platan',
  name: 'Plàtan',
  group: 'botiga',
  w: 64,
  h: 40,
  render: () => (
    <g>
      <path d="M4 10 C10 34 44 42 60 22 C62 18 58 16 56 20 C42 32 18 28 10 8 Z" fill={PALETTE.mango.base} />
      <path d="M10 14 C20 30 42 34 56 22 C44 38 16 36 10 14 Z" fill={PALETTE.mango.shade} />
      <rect x={4} y={4} width={7} height={8} rx={2} fill={PALETTE.xocolata.base} transform="rotate(-20 7 8)" />
    </g>
  ),
}

export const taronja: PropDef = {
  id: 'taronja',
  name: 'Taronja',
  group: 'botiga',
  w: 46,
  h: 46,
  render: () => (
    <g>
      <circle cx={23} cy={25} r={21} fill={PALETTE.mango.shade} />
      <circle cx={21} cy={23} r={19} fill="#FF9F2E" />
      <circle cx={14} cy={16} r={3} fill={PALETTE.mango.light} />
      <circle cx={30} cy={30} r={1.4} fill={PALETTE.mango.shade} />
      <circle cx={18} cy={34} r={1.4} fill={PALETTE.mango.shade} />
      {leaf(22, 6, -30)}
    </g>
  ),
}

export const barraPa: PropDef = {
  id: 'barra-pa',
  name: 'Barra de pa',
  group: 'botiga',
  w: 96,
  h: 34,
  render: () => (
    <g>
      <path d="M8 22 C4 8 22 4 48 4 C74 4 92 8 88 22 C86 32 70 32 48 32 C26 32 10 32 8 22 Z" fill="#E7A55A" />
      <path d="M12 26 C30 32 66 32 86 24 C84 32 68 32 48 32 C28 32 14 32 12 26 Z" fill="#C98337" />
      {[24, 42, 60, 76].map((x) => (
        <path key={x} d={`M${x} 10 q6 4 10 0`} stroke="#F8D49A" strokeWidth={4} strokeLinecap="round" fill="none" />
      ))}
    </g>
  ),
}

export const croissant: PropDef = {
  id: 'croissant',
  name: 'Croissant',
  group: 'botiga',
  w: 72,
  h: 44,
  render: () => (
    <g>
      <path d="M4 36 C2 20 16 6 36 6 C56 6 70 20 68 36 C60 30 54 30 50 34 C44 28 28 28 22 34 C18 30 12 30 4 36 Z" fill="#E7A55A" />
      <path d="M22 34 C24 18 48 18 50 34 C44 28 28 28 22 34 Z" fill="#F2C17F" />
      <path d="M36 8 C30 14 30 24 34 30 M52 12 C54 20 54 26 50 32 M20 12 C18 20 18 26 22 32" stroke="#C98337" strokeWidth={3} strokeLinecap="round" fill="none" />
    </g>
  ),
}

export const llet: PropDef = {
  id: 'llet',
  name: 'Brick de llet',
  group: 'botiga',
  w: 44,
  h: 78,
  render: () => (
    <g>
      <path d="M6 22 L22 6 L38 22 Z" fill={PALETTE.neu.shade} />
      <rect x={18} y={0} width={10} height={8} rx={2} fill={PALETTE.cel.base} />
      <rect x={6} y={20} width={32} height={58} rx={5} fill={PALETTE.neu.base} />
      <rect x={30} y={20} width={8} height={58} rx={3} fill={PALETTE.neu.shade} />
      <rect x={6} y={44} width={32} height={20} fill={PALETTE.cel.base} />
      <text x={20} y={58.5} fontSize={11} textAnchor="middle" fill={PALETTE.neu.light} style={SVG_TEXT}>
        LLET
      </text>
      <ellipse cx={14} cy={32} rx={5} ry={3.6} fill={PALETTE.carbo.base} opacity={0.75} />
    </g>
  ),
}

export const FOOD: readonly PropDef[] = [poma, platan, taronja, barraPa, croissant, llet]
