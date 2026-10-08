import { INK, PALETTE, swatch } from '../../palette'
import { sparklePath } from '../../paths'
import type { PropDef } from '../types'

/** Toys for the toy shelf. The ball and the car are recolourable. */

export const pilota: PropDef = {
  id: 'pilota',
  name: 'Pilota',
  group: 'botiga',
  w: 52,
  h: 52,
  recolourable: true,
  render: ({ color = 'coral' }) => {
    const c = swatch(color)
    return (
      <g>
        <circle cx={26} cy={26} r={25} fill={c.base} />
        <path d="M26 1 A25 25 0 0 1 51 26 L26 26 Z M26 51 A25 25 0 0 1 1 26 L26 26 Z" fill={PALETTE.neu.base} />
        <path d="M44 10 A25 25 0 0 1 44 42 A25 25 0 0 0 44 10 Z" fill={c.shade} opacity={0.5} />
        <circle cx={26} cy={26} r={6} fill={PALETTE.mango.base} />
        <ellipse cx={14} cy={13} rx={5} ry={3} fill={INK.white} opacity={0.6} transform="rotate(-35 14 13)" />
      </g>
    )
  },
}

export const osset: PropDef = {
  id: 'osset',
  name: 'Osset de peluix',
  group: 'botiga',
  w: 60,
  h: 66,
  render: () => {
    const fur = '#C98B5A'
    const dark = '#A86C40'
    return (
      <g>
        <ellipse cx={30} cy={50} rx={20} ry={16} fill={fur} />
        <ellipse cx={30} cy={53} rx={10} ry={9} fill="#EBC49D" />
        <circle cx={14} cy={60} r={7} fill={dark} />
        <circle cx={46} cy={60} r={7} fill={dark} />
        <circle cx={12} cy={10} r={8} fill={dark} />
        <circle cx={48} cy={10} r={8} fill={dark} />
        <circle cx={30} cy={24} r={20} fill={fur} />
        <ellipse cx={30} cy={30} rx={9} ry={7} fill="#EBC49D" />
        <circle cx={22} cy={21} r={2.8} fill={INK.face} />
        <circle cx={38} cy={21} r={2.8} fill={INK.face} />
        <ellipse cx={30} cy={27} rx={3.4} ry={2.4} fill={INK.face} />
        <path d="M22 42 L30 46 L38 42 L38 48 L30 45 L22 48 Z" fill={PALETTE.rosa.base} />
      </g>
    )
  },
}

export const cotxet: PropDef = {
  id: 'cotxet',
  name: 'Cotxet de joguina',
  group: 'botiga',
  w: 76,
  h: 44,
  recolourable: true,
  render: ({ color = 'cel' }) => {
    const c = swatch(color)
    return (
      <g>
        <path d="M18 14 C20 6 26 4 38 4 C50 4 54 8 58 16 Z" fill={c.shade} />
        <path d="M24 14 L28 8 L37 8 L37 14 Z M41 14 L41 8 L48 8 L53 14 Z" fill={PALETTE.cel.light} />
        <rect x={4} y={14} width={68} height={18} rx={9} fill={c.base} />
        <rect x={60} y={18} width={8} height={5} rx={2.5} fill={PALETTE.mango.light} />
        <circle cx={20} cy={34} r={9} fill={PALETTE.carbo.base} />
        <circle cx={56} cy={34} r={9} fill={PALETTE.carbo.base} />
        <circle cx={20} cy={34} r={3.5} fill={PALETTE.neu.shade} />
        <circle cx={56} cy={34} r={3.5} fill={PALETTE.neu.shade} />
      </g>
    )
  },
}

export const estrellaJoguina: PropDef = {
  id: 'vareta-magica',
  name: 'Vareta màgica',
  group: 'botiga',
  w: 40,
  h: 74,
  render: () => (
    <g>
      <rect x={17} y={26} width={6} height={48} rx={3} fill={PALETTE.lila.base} />
      <path d={sparklePath(20, 18, 18, 0.38)} fill={PALETTE.mango.base} />
      <path d={sparklePath(20, 18, 8, 0.4)} fill={PALETTE.mango.light} />
    </g>
  ),
}

export const TOYS: readonly PropDef[] = [pilota, osset, cotxet, estrellaJoguina]
