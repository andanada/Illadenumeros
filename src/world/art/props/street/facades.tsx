import { INK, PALETTE, swatch } from '../../palette'
import { softRectPath } from '../../paths'
import { SVG_TEXT, type PropDef } from '../types'

/** Phase 1 buildings: home, corner shop and the bus stop. Recolourable walls, fixed trims. */

const glass = PALETTE.cel.light
const frame = PALETTE.neu.base

function windowArt(x: number, y: number, w: number, h: number, curtain: string) {
  return (
    <g>
      <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={10} fill={frame} />
      <rect x={x} y={y} width={w} height={h} rx={6} fill={glass} />
      <path d={`M${x} ${y + 4} Q${x} ${y} ${x + 4} ${y} L${x + w * 0.32} ${y} Q${x + w * 0.2} ${y + h * 0.5} ${x + w * 0.1} ${y + h} L${x} ${y + h} Z`} fill={curtain} />
      <path d={`M${x + w} ${y + 4} Q${x + w} ${y} ${x + w - 4} ${y} L${x + w * 0.68} ${y} Q${x + w * 0.8} ${y + h * 0.5} ${x + w * 0.9} ${y + h} L${x + w} ${y + h} Z`} fill={curtain} />
      <path d={`M${x + w * 0.42} ${y + 8} l14 -6`} stroke={INK.white} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
      <rect x={x - 10} y={y + h + 4} width={w + 20} height={12} rx={5} fill={PALETTE.xocolata.base} />
      {[0.15, 0.4, 0.65, 0.88].map((f, i) => (
        <circle key={f} cx={x + w * f} cy={y + h + 2} r={6} fill={i % 2 ? PALETTE.coral.base : PALETTE.mango.base} />
      ))}
    </g>
  )
}

export const facanaCasa: PropDef = {
  id: 'facana-casa',
  name: 'Casa',
  group: 'carrer',
  w: 260,
  h: 330,
  recolourable: true,
  door: { x: 100, y: 228, w: 60, h: 102 },
  render: ({ color = 'rosa' }) => {
    const c = swatch(color)
    return (
      <g>
        <rect x={176} y={20} width={30} height={60} rx={6} fill={PALETTE.xocolata.shade} />
        <path d={softRectPath({ x: 14, y: 90, w: 232, h: 240, r: 18, wobble: 2, seed: 'casa' })} fill={c.base} />
        <path d="M196 98 L246 98 L246 312 Q246 330 228 330 L196 330 Z" fill={c.shade} opacity={0.5} />
        <path d="M0 104 Q4 92 16 86 L118 26 Q130 20 142 26 L244 86 Q256 92 260 104 Q256 112 246 110 L14 110 Q4 112 0 104 Z" fill={PALETTE.coral.shade} />
        <circle cx={130} cy={66} r={16} fill={frame} />
        <circle cx={130} cy={66} r={10} fill={glass} />
        {windowArt(36, 136, 64, 58, PALETTE.mango.light)}
        {windowArt(160, 136, 64, 58, PALETTE.mango.light)}
        <path d="M100 330 L100 256 Q100 228 130 228 Q160 228 160 256 L160 330 Z" fill={PALETTE.cel.base} />
        <path d="M108 330 L108 258 Q108 238 130 236 L130 330 Z" fill={PALETTE.cel.shade} opacity={0.5} />
        <circle cx={148} cy={284} r={4.5} fill={PALETTE.mango.base} />
        <rect x={120} y={214} width={20} height={14} rx={4} fill={frame} />
        <text x={130} y={225.5} fontSize={11} textAnchor="middle" fill={PALETTE.carbo.base} style={SVG_TEXT}>
          1
        </text>
        <rect x={86} y={322} width={88} height={8} rx={4} fill={PALETTE.neu.shade} />
      </g>
    )
  },
}

export const facanaBotiga: PropDef = {
  id: 'facana-botiga',
  name: 'Botiga',
  group: 'carrer',
  w: 320,
  h: 330,
  recolourable: true,
  door: { x: 214, y: 196, w: 70, h: 134 },
  render: ({ color = 'menta' }) => {
    const c = swatch(color)
    return (
      <g>
        <path d={softRectPath({ x: 10, y: 40, w: 300, h: 290, r: 16, wobble: 2, seed: 'botiga' })} fill={c.base} />
        <path d="M262 46 L310 56 L310 314 Q310 330 294 330 L262 330 Z" fill={c.shade} opacity={0.5} />
        <path d={softRectPath({ x: 50, y: 0, w: 220, h: 56, r: 16, wobble: 1.5, seed: 'rètol' })} fill={PALETTE.mango.base} />
        <text x={160} y={39} fontSize={30} textAnchor="middle" fill={PALETTE.carbo.base} style={{ ...SVG_TEXT, letterSpacing: 2 }}>
          BOTIGA
        </text>
        <rect x={20} y={112} width={280} height={12} rx={6} fill={PALETTE.coral.shade} />
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i} d={`M${20 + i * 40} 76 L${60 + i * 40} 76 L${60 + i * 40} 112 Q${40 + i * 40} 132 ${20 + i * 40} 112 Z`} fill={i % 2 ? PALETTE.neu.base : PALETTE.coral.base} />
        ))}
        <rect x={20} y={70} width={280} height={10} rx={5} fill={PALETTE.coral.shade} />
        <rect x={30} y={150} width={164} height={130} rx={12} fill={frame} />
        <rect x={38} y={158} width={148} height={114} rx={8} fill={glass} />
        <rect x={38} y={208} width={148} height={6} fill={PALETTE.xocolata.light} />
        <rect x={38} y={252} width={148} height={6} fill={PALETTE.xocolata.light} />
        {[56, 82, 108, 134, 160].map((x, i) => (
          <circle key={x} cx={x} cy={198} r={9} fill={[PALETTE.coral.base, PALETTE.mango.base, PALETTE.llima.base, PALETTE.coral.base, '#FF9F2E'][i]} />
        ))}
        {[60, 96, 132, 166].map((x, i) => (
          <rect key={x} x={x - 9} y={226} width={18} height={26} rx={4} fill={i % 2 ? PALETTE.neu.base : PALETTE.rosa.base} />
        ))}
        <path d="M48 170 l22 -8" stroke={INK.white} strokeWidth={5} strokeLinecap="round" opacity={0.75} />
        <rect x={206} y={188} width={86} height={142} rx={12} fill={frame} />
        <rect x={214} y={196} width={70} height={134} rx={8} fill={PALETTE.carbo.light} />
        <rect x={222} y={206} width={54} height={66} rx={6} fill={glass} />
        <rect x={232} y={226} width={34} height={18} rx={4} fill={PALETTE.neu.base} />
        <text x={249} y={239.5} fontSize={10} textAnchor="middle" fill={PALETTE.menta.shade} style={SVG_TEXT}>
          OBERT
        </text>
        <circle cx={270} cy={290} r={4.5} fill={PALETTE.mango.base} />
      </g>
    )
  },
}

export const paradaBus: PropDef = {
  id: 'parada-autobus',
  name: "Parada de l'autobús",
  group: 'carrer',
  w: 260,
  h: 270,
  recolourable: true,
  door: { x: 30, y: 70, w: 160, h: 200 },
  render: ({ color = 'cel' }) => {
    const c = swatch(color)
    return (
      <g>
        <rect x={34} y={66} width={10} height={204} rx={5} fill={PALETTE.carbo.light} />
        <rect x={176} y={66} width={10} height={204} rx={5} fill={PALETTE.carbo.light} />
        <rect x={44} y={84} width={132} height={130} rx={8} fill={glass} opacity={0.65} />
        <path d="M60 100 l30 -10 M60 116 l18 -6" stroke={INK.white} strokeWidth={5} strokeLinecap="round" opacity={0.8} />
        <path d={softRectPath({ x: 18, y: 48, w: 184, h: 28, r: 12, wobble: 1, seed: 'sostre' })} fill={c.base} />
        <rect x={18} y={66} width={184} height={10} rx={5} fill={c.shade} />
        <rect x={56} y={212} width={108} height={14} rx={7} fill={PALETTE.mango.base} />
        <rect x={64} y={224} width={8} height={30} rx={3} fill={PALETTE.mango.shade} />
        <rect x={148} y={224} width={8} height={30} rx={3} fill={PALETTE.mango.shade} />
        <rect x={226} y={60} width={8} height={210} rx={4} fill={PALETTE.carbo.light} />
        <circle cx={230} cy={44} r={28} fill={PALETTE.neu.base} />
        <circle cx={230} cy={44} r={22} fill={c.base} />
        <text x={230} y={51} fontSize={19} textAnchor="middle" fill={PALETTE.neu.light} style={SVG_TEXT}>
          BUS
        </text>
        <rect x={214} y={96} width={32} height={44} rx={5} fill={PALETTE.neu.base} />
        {[106, 116, 126].map((y) => (
          <rect key={y} x={220} y={y} width={20} height={4} rx={2} fill={PALETTE.carbo.light} opacity={0.6} />
        ))}
      </g>
    )
  },
}

export const FACADES: readonly PropDef[] = [facanaCasa, facanaBotiga, paradaBus]
