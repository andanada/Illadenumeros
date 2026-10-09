import { PALETTE as P } from '../../../art/palette'
import type { FurnitureDef } from './types'

/** Big pieces: wardrobe, shelves, TV, fish tank, rocking horse and the rugs. */

const WOOD = { base: '#D9A274', shade: '#B57849', light: '#EEC49B' }

export const armari: FurnitureDef = {
  id: 'armari',
  name: 'Armari',
  price: 50,
  w: 150,
  h: 250,
  color: 'cel',
  recolourable: true,
  room: 'habitacio',
  render: ({ c }) => (
    <g>
      <rect x={0} y={0} width={150} height={18} rx={9} fill={WOOD.shade} />
      <rect x={6} y={14} width={138} height={222} rx={14} fill={c.base} />
      <rect x={118} y={14} width={26} height={222} rx={10} fill={c.shade} />
      <rect x={16} y={26} width={50} height={196} rx={10} fill={c.light} />
      <rect x={72} y={26} width={50} height={196} rx={10} fill={c.light} />
      <circle cx={60} cy={124} r={5} fill={P.mango.base} />
      <circle cx={78} cy={124} r={5} fill={P.mango.base} />
      <rect x={14} y={234} width={14} height={16} rx={4} fill={WOOD.shade} />
      <rect x={122} y={234} width={14} height={16} rx={4} fill={WOOD.shade} />
    </g>
  ),
}

export const prestatgeria: FurnitureDef = {
  id: 'prestatgeria',
  name: 'Prestatgeria amb llibres',
  price: 35,
  w: 140,
  h: 210,
  color: 'neu',
  room: 'sala',
  render: () => {
    const books = [P.coral.base, P.cel.base, P.mango.base, P.menta.base, P.lila.base, P.rosa.base]
    return (
      <g>
        <rect x={0} y={0} width={140} height={210} rx={12} fill={WOOD.base} />
        <rect x={118} y={0} width={22} height={210} rx={10} fill={WOOD.shade} />
        {[12, 76, 140].map((y, row) => (
          <g key={y}>
            <rect x={10} y={y} width={106} height={56} rx={6} fill="#F6DDB9" />
            {books.slice(row, row + 4).map((b, k) => (
              <rect key={b} x={16 + k * 18} y={y + 12 + (k % 2) * 6} width={14} height={44 - (k % 2) * 6} rx={3} fill={b} />
            ))}
            {row === 1 && <circle cx={100} cy={y + 40} r={12} fill={P.llima.base} />}
          </g>
        ))}
      </g>
    )
  },
}

export const tele: FurnitureDef = {
  id: 'tele',
  name: 'Televisor',
  price: 60,
  w: 180,
  h: 170,
  color: 'carbo',
  action: 'lamp',
  room: 'sala',
  render: ({ lit }) => (
    <g>
      <rect x={0} y={96} width={180} height={60} rx={12} fill={WOOD.base} />
      <rect x={10} y={108} width={74} height={36} rx={8} fill={WOOD.light} />
      <rect x={96} y={108} width={74} height={36} rx={8} fill={WOOD.light} />
      <rect x={14} y={154} width={10} height={16} rx={3} fill={WOOD.shade} />
      <rect x={156} y={154} width={10} height={16} rx={3} fill={WOOD.shade} />
      <rect x={80} y={78} width={20} height={20} rx={4} fill={P.carbo.light} />
      <rect x={14} y={0} width={152} height={84} rx={12} fill={P.carbo.base} />
      <rect x={22} y={8} width={136} height={68} rx={8} fill={lit ? P.cel.light : P.carbo.light} />
      {lit && <circle cx={120} cy={30} r={12} fill={P.mango.light} />}
      {lit && <path d="M22 60 Q70 36 110 56 Q140 46 158 54 L158 76 L22 76 Z" fill={P.llima.base} />}
      <path d="M32 18 l20 -6" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.5} />
    </g>
  ),
}

export const peixera: FurnitureDef = {
  id: 'peixera',
  name: 'Peixera',
  price: 40,
  w: 120,
  h: 150,
  color: 'cel',
  room: 'sala',
  render: () => (
    <g>
      <rect x={20} y={110} width={80} height={40} rx={8} fill={WOOD.base} />
      <rect x={84} y={110} width={16} height={40} rx={6} fill={WOOD.shade} />
      <path d="M8 56 Q8 6 60 6 Q112 6 112 56 Q112 110 60 112 Q8 110 8 56 Z" fill="#BFE6FF" />
      <path d="M12 60 Q60 48 108 60 Q106 108 60 110 Q14 108 12 60 Z" fill={P.cel.base} opacity={0.6} />
      <path d="M40 80 q12 -12 24 0 q-12 12 -24 0 Z" fill={P.mango.base} />
      <path d="M64 80 l10 -8 l0 16 Z" fill={P.mango.shade} />
      <circle cx={46} cy={78} r={2} fill={P.carbo.base} />
      <path d="M26 108 q4 -24 0 -40 M90 108 q-6 -20 2 -36" stroke={P.llima.shade} strokeWidth={5} fill="none" strokeLinecap="round" />
      <circle cx={80} cy={46} r={4} fill="#fff" opacity={0.8} />
      <circle cx={86} cy={34} r={3} fill="#fff" opacity={0.8} />
    </g>
  ),
}

export const cavall: FurnitureDef = {
  id: 'cavall-balanci',
  name: 'Cavall de balancí',
  price: 35,
  w: 150,
  h: 130,
  color: 'coral',
  recolourable: true,
  room: 'habitacio',
  render: ({ c }) => (
    <g>
      <path d="M4 112 Q75 140 146 112" stroke={WOOD.shade} strokeWidth={10} fill="none" strokeLinecap="round" />
      <rect x={34} y={80} width={10} height={36} rx={4} fill={c.shade} />
      <rect x={104} y={80} width={10} height={36} rx={4} fill={c.shade} />
      <rect x={28} y={50} width={94} height={40} rx={20} fill={c.base} />
      <path d="M100 56 L112 10 Q116 0 128 4 L146 16 Q150 26 140 28 L124 26 L118 60 Z" fill={c.base} />
      <path d="M112 10 Q104 20 104 40 L96 40 Q98 16 112 10 Z" fill={P.mango.base} />
      <circle cx={130} cy={14} r={3} fill={P.carbo.base} />
      <path d="M28 66 Q10 70 8 90" stroke={P.mango.base} strokeWidth={8} fill="none" strokeLinecap="round" />
      <rect x={58} y={44} width={30} height={12} rx={6} fill={P.cel.base} />
    </g>
  ),
}

export const catifaRodona: FurnitureDef = {
  id: 'catifa-rodona',
  name: 'Catifa rodona',
  price: 0,
  w: 240,
  h: 60,
  color: 'lila',
  recolourable: true,
  flat: true,
  room: 'sala',
  render: ({ c }) => (
    <g>
      <ellipse cx={120} cy={32} rx={120} ry={28} fill={c.shade} />
      <ellipse cx={120} cy={30} rx={112} ry={24} fill={c.base} />
      <ellipse cx={120} cy={30} rx={74} ry={15} fill={c.light} />
      <ellipse cx={120} cy={30} rx={34} ry={7} fill={c.base} />
    </g>
  ),
}

export const catifaRatlles: FurnitureDef = {
  id: 'catifa-ratlles',
  name: 'Catifa de ratlles',
  price: 12,
  w: 260,
  h: 56,
  color: 'menta',
  recolourable: true,
  flat: true,
  room: 'habitacio',
  render: ({ c }) => (
    <g>
      <path d="M20 4 L240 4 L260 52 L0 52 Z" fill={c.base} />
      {[0, 1, 2, 3, 4].map((k) => (
        <path key={k} d={`M${28 + k * 46} 4 L${48 + k * 46} 4 L${42 + k * 50} 52 L${18 + k * 50} 52 Z`} fill={k % 2 ? c.light : P.neu.base} />
      ))}
      <rect x={0} y={50} width={260} height={6} rx={3} fill={c.shade} />
    </g>
  ),
}

export const STORAGE: readonly FurnitureDef[] = [armari, prestatgeria, tele, peixera, cavall, catifaRodona, catifaRatlles]
