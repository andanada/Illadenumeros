import { PALETTE } from '../../palette'
import { SVG_TEXT, type PropDef } from '../types'

/**
 * Euro coins and notes for the till and change errands. Simplified and friendly (not replicas), but
 * colour-coded like the real ones: copper cents, gold cents, bimetal 1 € / 2 €, grey 5, red 10, blue 20.
 */

const GOLD = { base: '#F2C14E', shade: '#D19A2A', light: '#FBE09A' }
const SILVER = { base: '#D9DEE6', shade: '#AEB6C3', light: '#F4F6F9' }
const COPPER = { base: '#D98A55', shade: '#B4683A', light: '#F0B48A' }

type Metal = typeof GOLD

function coin(id: string, name: string, label: string, r: number, outer: Metal, inner?: Metal): PropDef {
  const d = r * 2 + 2
  return {
    id,
    name,
    group: 'diners',
    w: d,
    h: d,
    render: () => (
      <g>
        <circle cx={r + 1} cy={r + 2} r={r} fill={outer.shade} />
        <circle cx={r + 1} cy={r} r={r} fill={outer.base} />
        {inner && <circle cx={r + 1} cy={r} r={r * 0.66} fill={inner.base} />}
        <path d={`M${r * 0.45} ${r * 0.6} A${r * 0.8} ${r * 0.8} 0 0 1 ${r * 1.2} ${r * 0.22}`} stroke={(inner ?? outer).light} strokeWidth={r * 0.14} strokeLinecap="round" fill="none" />
        <text x={r + 1} y={r + r * 0.32} fontSize={r * 0.9} textAnchor="middle" fill={PALETTE.carbo.base} style={SVG_TEXT}>
          {label}
        </text>
      </g>
    ),
  }
}

function note(id: string, name: string, value: number, color: { base: string; shade: string; light: string }): PropDef {
  return {
    id,
    name,
    group: 'diners',
    w: 104,
    h: 56,
    render: () => (
      <g>
        <rect x={2} y={4} width={100} height={52} rx={7} fill={color.shade} />
        <rect x={2} y={0} width={100} height={52} rx={7} fill={color.base} />
        <rect x={8} y={6} width={88} height={40} rx={4} fill={color.light} opacity={0.45} />
        <circle cx={74} cy={26} r={15} fill={color.light} opacity={0.8} />
        <path d="M66 32 L66 22 Q74 12 82 22 L82 32 Z" fill={color.shade} opacity={0.6} />
        <text x={30} y={35} fontSize={26} textAnchor="middle" fill={PALETTE.neu.light} style={SVG_TEXT}>
          {value}
        </text>
        <text x={92} y={14} fontSize={10} textAnchor="middle" fill={PALETTE.neu.light} style={SVG_TEXT}>
          €
        </text>
      </g>
    ),
  }
}

export const MONEY: readonly PropDef[] = [
  coin('moneda-10c', 'Moneda de 10 cèntims', '10', 13, GOLD),
  coin('moneda-20c', 'Moneda de 20 cèntims', '20', 14, GOLD),
  coin('moneda-50c', 'Moneda de 50 cèntims', '50', 16, GOLD),
  coin('moneda-1', "Moneda d'1 euro", '1€', 17, GOLD, SILVER),
  coin('moneda-2', 'Moneda de 2 euros', '2€', 19, SILVER, GOLD),
  coin('moneda-5c', 'Moneda de 5 cèntims', '5', 12, COPPER),
  note('bitllet-5', 'Bitllet de 5 euros', 5, { base: '#9AA6A8', shade: '#768486', light: '#D3DBDC' }),
  note('bitllet-10', 'Bitllet de 10 euros', 10, { base: PALETTE.coral.base, shade: PALETTE.coral.shade, light: PALETTE.coral.light }),
  note('bitllet-20', 'Bitllet de 20 euros', 20, { base: PALETTE.cel.base, shade: PALETTE.cel.shade, light: PALETTE.cel.light }),
]

/** Town coin ("moneda" of the HUD, the reward currency): a gold coin with a star. */
export const MONEDA_POBLE: PropDef = {
  id: 'moneda-poble',
  name: 'Moneda del poble',
  group: 'diners',
  w: 40,
  h: 42,
  floating: true,
  render: () => (
    <g>
      <circle cx={20} cy={22} r={19} fill={GOLD.shade} />
      <circle cx={20} cy={19} r={19} fill={GOLD.base} />
      <circle cx={20} cy={19} r={13} fill={GOLD.light} opacity={0.55} />
      <path d="M20 9 l3 6.5 7 .8 -5.2 4.8 1.4 7 -6.2 -3.5 -6.2 3.5 1.4 -7 -5.2 -4.8 7 -.8 Z" fill={GOLD.shade} />
    </g>
  ),
}
