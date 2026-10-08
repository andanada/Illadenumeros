import { INK, PALETTE, swatch } from '../../palette'
import { softRectPath } from '../../paths'
import { SVG_TEXT, type PropDef } from '../types'

/** Shop furniture: shelf, till, basket and price tag. */

export const prestatge: PropDef = {
  id: 'prestatge',
  name: 'Prestatge',
  group: 'botiga',
  w: 240,
  h: 210,
  recolourable: true,
  render: ({ color = 'menta' }) => {
    const c = swatch(color)
    return (
      <g>
        <path d={softRectPath({ x: 0, y: 0, w: 240, h: 204, r: 14, wobble: 1.5, seed: 'prestatge' })} fill={c.base} />
        <rect x={12} y={12} width={216} height={186} rx={8} fill={c.shade} />
        <rect x={20} y={16} width={200} height={180} rx={6} fill="#F7E6CF" />
        {[66, 130, 192].map((y) => (
          <g key={y}>
            <rect x={12} y={y} width={216} height={12} rx={4} fill={c.base} />
            <rect x={12} y={y + 10} width={216} height={4} fill={c.shade} />
          </g>
        ))}
        <rect x={14} y={200} width={20} height={10} rx={3} fill={c.shade} />
        <rect x={206} y={200} width={20} height={10} rx={3} fill={c.shade} />
      </g>
    )
  },
}

/** Shelf board heights (y of the top of each board), for scenes that place goods on it. */
export const SHELF_BOARDS = [66, 130, 192] as const

export const caixa: PropDef = {
  id: 'caixa-registradora',
  name: 'Caixa registradora',
  group: 'botiga',
  w: 150,
  h: 130,
  recolourable: true,
  render: ({ color = 'coral', label = '0,00' }) => {
    const c = swatch(color)
    return (
      <g>
        <rect x={84} y={0} width={56} height={36} rx={8} fill={PALETTE.carbo.base} />
        <rect x={90} y={6} width={44} height={22} rx={4} fill={PALETTE.llima.light} />
        <text x={112} y={22.5} fontSize={13} textAnchor="middle" fill={PALETTE.carbo.base} style={SVG_TEXT}>
          {label}
        </text>
        <rect x={106} y={34} width={12} height={16} fill={PALETTE.carbo.shade} />
        <path d={softRectPath({ x: 4, y: 46, w: 142, h: 62, r: 14, wobble: 1, seed: 'caixa' })} fill={c.base} />
        <rect x={118} y={52} width={22} height={52} rx={8} fill={c.shade} />
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <rect key={`${row}${col}`} x={16 + col * 22} y={54 + row * 16} width={16} height={11} rx={4} fill={col === 3 && row === 2 ? PALETTE.llima.base : PALETTE.neu.base} />
          )),
        )}
        <rect x={0} y={104} width={150} height={26} rx={8} fill={c.shade} />
        <rect x={50} y={114} width={50} height={6} rx={3} fill={c.light} />
      </g>
    )
  },
}

export const cistella: PropDef = {
  id: 'cistella',
  name: 'Cistella',
  group: 'botiga',
  w: 110,
  h: 84,
  recolourable: true,
  render: ({ color = 'coral' }) => {
    const c = swatch(color)
    return (
      <g>
        <path d="M22 34 C22 4 88 4 88 34" stroke={c.shade} strokeWidth={8} strokeLinecap="round" fill="none" />
        <path d="M4 32 L106 32 L94 80 Q92 84 88 84 L22 84 Q18 84 16 80 Z" fill={c.base} />
        <rect x={0} y={28} width={110} height={12} rx={6} fill={c.shade} />
        {[26, 44, 62, 80].map((x) => (
          <rect key={x} x={x} y={46} width={8} height={30} rx={4} fill={c.shade} opacity={0.55} />
        ))}
      </g>
    )
  },
}

export const etiquetaPreu: PropDef = {
  id: 'etiqueta-preu',
  name: 'Etiqueta de preu',
  group: 'botiga',
  w: 64,
  h: 38,
  floating: true,
  recolourable: true,
  render: ({ color = 'mango', label = '1 €' }) => {
    const c = swatch(color)
    return (
      <g>
        <path d="M14 2 L60 2 Q64 2 64 6 L64 32 Q64 36 60 36 L14 36 L2 19 Z" fill={c.shade} transform="translate(0 2)" />
        <path d="M14 2 L60 2 Q64 2 64 6 L64 32 Q64 36 60 36 L14 36 L2 19 Z" fill={c.base} />
        <circle cx={13} cy={19} r={3.5} fill={INK.white} />
        <text x={39} y={25.5} fontSize={17} textAnchor="middle" fill={PALETTE.carbo.base} style={SVG_TEXT}>
          {label}
        </text>
      </g>
    )
  },
}

export const FIXTURES: readonly PropDef[] = [prestatge, caixa, cistella, etiquetaPreu]
