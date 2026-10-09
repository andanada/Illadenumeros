import { PALETTE as P } from '../../../art/palette'
import type { FurnitureDef } from './types'

/** Beds, seats and tables. Flat shapes, no outlines, the "turned away" side in the shade tone. */

const WOOD = { base: '#D9A274', shade: '#B57849', light: '#EEC49B' }

const leg = (x: number, y: number, h: number, fill = WOOD.shade) => <rect x={x} y={y} width={8} height={h} rx={3} fill={fill} />

export const llit: FurnitureDef = {
  id: 'llit',
  name: 'Llit',
  price: 0,
  w: 260,
  h: 160,
  color: 'cel',
  recolourable: true,
  action: 'bed',
  room: 'habitacio',
  render: ({ c }) => (
    <g>
      <rect x={6} y={0} width={34} height={160} rx={14} fill={WOOD.base} />
      <rect x={30} y={8} width={10} height={152} rx={4} fill={WOOD.shade} />
      <rect x={226} y={60} width={30} height={100} rx={12} fill={WOOD.base} />
      <rect x={30} y={88} width={210} height={52} rx={14} fill={P.neu.base} />
      <rect x={44} y={64} width={60} height={34} rx={16} fill={P.neu.light} />
      <path d="M96 84 Q170 70 240 84 L240 132 Q170 142 96 132 Z" fill={c.base} />
      <path d="M96 116 Q170 126 240 116 L240 132 Q170 142 96 132 Z" fill={c.shade} />
      {[120, 160, 200].map((x) => (
        <circle key={x} cx={x} cy={100} r={5} fill={c.light} />
      ))}
      {leg(40, 138, 22)}
      {leg(226, 138, 22)}
    </g>
  ),
}

export const sofa: FurnitureDef = {
  id: 'sofa',
  name: 'Sofà',
  price: 45,
  w: 250,
  h: 130,
  color: 'menta',
  recolourable: true,
  room: 'sala',
  render: ({ c }) => (
    <g>
      <rect x={24} y={0} width={202} height={78} rx={30} fill={c.shade} />
      <rect x={34} y={8} width={86} height={64} rx={24} fill={c.base} />
      <rect x={130} y={8} width={86} height={64} rx={24} fill={c.base} />
      <rect x={20} y={62} width={210} height={44} rx={18} fill={c.base} />
      <rect x={20} y={92} width={210} height={14} rx={7} fill={c.shade} />
      <rect x={0} y={40} width={42} height={76} rx={20} fill={c.base} />
      <rect x={208} y={40} width={42} height={76} rx={20} fill={c.shade} />
      <circle cx={18} cy={54} r={6} fill={c.light} />
      {leg(28, 112, 18, P.xocolata.base)}
      {leg(214, 112, 18, P.xocolata.base)}
    </g>
  ),
}

export const butaca: FurnitureDef = {
  id: 'butaca',
  name: 'Butaca',
  price: 30,
  w: 130,
  h: 140,
  color: 'mango',
  recolourable: true,
  room: 'sala',
  render: ({ c }) => (
    <g>
      <path d="M20 70 Q16 0 65 0 Q114 0 110 70 Z" fill={c.shade} />
      <path d="M30 70 Q28 12 65 10 Q100 12 98 70 Z" fill={c.base} />
      <rect x={14} y={70} width={102} height={40} rx={16} fill={c.base} />
      <rect x={0} y={56} width={30} height={64} rx={14} fill={c.base} />
      <rect x={100} y={56} width={30} height={64} rx={14} fill={c.shade} />
      <circle cx={65} cy={40} r={6} fill={c.light} />
      {leg(22, 118, 22, P.xocolata.base)}
      {leg(100, 118, 22, P.xocolata.base)}
    </g>
  ),
}

export const cadira: FurnitureDef = {
  id: 'cadira',
  name: 'Cadira',
  price: 0,
  w: 80,
  h: 130,
  color: 'coral',
  recolourable: true,
  room: 'cuina',
  render: ({ c }) => (
    <g>
      <rect x={10} y={0} width={60} height={56} rx={18} fill={c.base} />
      <rect x={22} y={14} width={36} height={8} rx={4} fill={c.light} />
      <rect x={14} y={50} width={10} height={30} rx={4} fill={c.shade} />
      <rect x={4} y={74} width={72} height={18} rx={9} fill={c.base} />
      <rect x={4} y={86} width={72} height={6} rx={3} fill={c.shade} />
      {leg(10, 90, 40, c.shade)}
      {leg(62, 90, 40, c.shade)}
    </g>
  ),
}

export const taula: FurnitureDef = {
  id: 'taula',
  name: 'Taula rodona',
  price: 25,
  w: 190,
  h: 120,
  color: 'neu',
  room: 'cuina',
  render: () => (
    <g>
      <ellipse cx={95} cy={22} rx={95} ry={22} fill={WOOD.base} />
      <ellipse cx={95} cy={16} rx={88} ry={15} fill={WOOD.light} />
      <path d="M30 30 Q95 70 160 30 L160 40 Q95 80 30 40 Z" fill={P.coral.light} />
      <rect x={86} y={36} width={18} height={76} rx={6} fill={WOOD.shade} />
      <ellipse cx={95} cy={114} rx={40} ry={7} fill={WOOD.shade} />
    </g>
  ),
}

export const tauleta: FurnitureDef = {
  id: 'tauleta',
  name: 'Tauleta de nit',
  price: 15,
  w: 90,
  h: 100,
  color: 'lila',
  recolourable: true,
  room: 'habitacio',
  render: ({ c }) => (
    <g>
      <rect x={0} y={0} width={90} height={14} rx={7} fill={WOOD.light} />
      <rect x={6} y={12} width={78} height={70} rx={10} fill={c.base} />
      <rect x={64} y={12} width={20} height={70} rx={8} fill={c.shade} />
      <rect x={14} y={24} width={52} height={22} rx={6} fill={c.light} />
      <rect x={14} y={52} width={52} height={22} rx={6} fill={c.light} />
      <circle cx={40} cy={35} r={4} fill={P.mango.base} />
      <circle cx={40} cy={63} r={4} fill={P.mango.base} />
      {leg(10, 80, 20)}
      {leg(72, 80, 20)}
    </g>
  ),
}

export const escriptori: FurnitureDef = {
  id: 'escriptori',
  name: 'Escriptori',
  price: 30,
  w: 200,
  h: 130,
  color: 'llima',
  recolourable: true,
  room: 'habitacio',
  render: ({ c }) => (
    <g>
      <rect x={0} y={30} width={200} height={16} rx={8} fill={WOOD.light} />
      <rect x={130} y={44} width={62} height={72} rx={10} fill={c.base} />
      <rect x={176} y={44} width={16} height={72} rx={6} fill={c.shade} />
      <rect x={138} y={56} width={36} height={18} rx={5} fill={c.light} />
      <rect x={138} y={84} width={36} height={18} rx={5} fill={c.light} />
      {leg(10, 44, 86)}
      {leg(140, 114, 16)}
      <rect x={30} y={4} width={40} height={26} rx={4} fill={P.cel.base} />
      <rect x={34} y={0} width={32} height={8} rx={3} fill={P.neu.base} />
      <rect x={90} y={14} width={12} height={16} rx={3} fill={P.coral.base} />
      <rect x={104} y={10} width={10} height={20} rx={3} fill={P.mango.base} />
    </g>
  ),
}

export const puf: FurnitureDef = {
  id: 'puf',
  name: 'Puf',
  price: 12,
  w: 100,
  h: 70,
  color: 'rosa',
  recolourable: true,
  room: 'sala',
  render: ({ c }) => (
    <g>
      <path d="M8 40 Q0 4 50 2 Q100 4 92 40 Q100 70 50 70 Q0 70 8 40 Z" fill={c.base} />
      <path d="M70 6 Q100 12 92 40 Q100 70 50 70 Q86 56 70 6 Z" fill={c.shade} />
      <path d="M50 4 L50 68 M20 12 Q34 40 22 66 M80 12 Q66 40 78 66" stroke={c.light} strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
  ),
}

export const coixi: FurnitureDef = {
  id: 'coixi',
  name: 'Coixí',
  price: 0,
  w: 70,
  h: 50,
  color: 'mango',
  recolourable: true,
  room: 'sala',
  render: ({ c }) => (
    <g>
      <path d="M4 8 Q35 0 66 8 Q72 25 66 44 Q35 52 4 44 Q-2 25 4 8 Z" fill={c.base} />
      <path d="M4 34 Q35 42 66 34 L66 44 Q35 52 4 44 Z" fill={c.shade} />
      <circle cx={35} cy={24} r={6} fill={c.light} />
    </g>
  ),
}

export const SEATING: readonly FurnitureDef[] = [llit, sofa, butaca, cadira, taula, tauleta, escriptori, puf, coixi]
