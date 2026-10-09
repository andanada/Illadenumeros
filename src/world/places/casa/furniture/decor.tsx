import { PALETTE as P } from '../../../art/palette'
import type { FurnitureDef } from './types'

/** Lamps, plants and things for the walls. */

const GLOW = '#FFF3B0'

export const lampadaPeu: FurnitureDef = {
  id: 'lampada-peu',
  name: 'Làmpada de peu',
  price: 20,
  w: 100,
  h: 220,
  color: 'mango',
  recolourable: true,
  action: 'lamp',
  room: 'sala',
  render: ({ c, lit }) => (
    <g>
      {lit && <ellipse cx={50} cy={60} rx={50} ry={40} fill={GLOW} opacity={0.55} />}
      <rect x={46} y={50} width={8} height={160} rx={4} fill={P.carbo.light} />
      <ellipse cx={50} cy={212} rx={30} ry={8} fill={P.carbo.light} />
      <path d="M14 56 L30 4 L70 4 L86 56 Z" fill={c.base} />
      <path d="M58 4 L70 4 L86 56 L66 56 Z" fill={c.shade} />
      <ellipse cx={50} cy={58} rx={14} ry={6} fill={lit ? GLOW : P.neu.shade} />
    </g>
  ),
}

export const lampadaTaula: FurnitureDef = {
  id: 'lampada-taula',
  name: 'Llum de tauleta',
  price: 10,
  w: 70,
  h: 90,
  color: 'rosa',
  recolourable: true,
  action: 'lamp',
  room: 'habitacio',
  render: ({ c, lit }) => (
    <g>
      {lit && <circle cx={35} cy={30} r={34} fill={GLOW} opacity={0.55} />}
      <path d="M10 40 Q10 4 35 4 Q60 4 60 40 Z" fill={c.base} />
      <path d="M35 4 Q60 4 60 40 L46 40 Q48 14 35 4 Z" fill={c.shade} />
      <ellipse cx={35} cy={42} rx={10} ry={5} fill={lit ? GLOW : P.neu.shade} />
      <rect x={31} y={40} width={8} height={36} rx={3} fill={P.neu.shade} />
      <ellipse cx={35} cy={82} rx={22} ry={8} fill={c.shade} />
    </g>
  ),
}

export const plantaTest: FurnitureDef = {
  id: 'planta-test',
  name: 'Planta',
  price: 0,
  w: 90,
  h: 120,
  color: 'coral',
  recolourable: true,
  room: 'sala',
  render: ({ c }) => (
    <g>
      <path d="M45 76 Q10 60 8 24 Q34 34 45 76 Z" fill={P.menta.shade} />
      <path d="M45 76 Q80 56 84 18 Q56 32 45 76 Z" fill={P.menta.base} />
      <path d="M45 76 Q40 30 48 0 Q62 36 45 76 Z" fill={P.llima.base} />
      <path d="M18 76 L72 76 L64 120 L26 120 Z" fill={c.base} />
      <path d="M54 76 L72 76 L64 120 L52 120 Z" fill={c.shade} />
      <rect x={14} y={72} width={62} height={10} rx={5} fill={c.light} />
    </g>
  ),
}

export const cactus: FurnitureDef = {
  id: 'cactus',
  name: 'Cactus',
  price: 8,
  w: 60,
  h: 90,
  color: 'mango',
  recolourable: true,
  room: 'cuina',
  render: ({ c }) => (
    <g>
      <rect x={20} y={6} width={22} height={60} rx={11} fill={P.llima.shade} />
      <rect x={6} y={26} width={14} height={26} rx={7} fill={P.llima.base} />
      <rect x={42} y={18} width={14} height={24} rx={7} fill={P.llima.base} />
      <circle cx={31} cy={6} r={6} fill={P.rosa.base} />
      <path d="M12 60 L50 60 L44 90 L18 90 Z" fill={c.base} />
      <path d="M36 60 L50 60 L44 90 L34 90 Z" fill={c.shade} />
    </g>
  ),
}

export const gerroFlors: FurnitureDef = {
  id: 'gerro-flors',
  name: 'Gerro amb flors',
  price: 9,
  w: 70,
  h: 100,
  color: 'cel',
  recolourable: true,
  room: 'cuina',
  render: ({ c }) => (
    <g>
      {[
        [20, 18, P.coral.base],
        [38, 8, P.mango.base],
        [54, 22, P.rosa.base],
      ].map(([x, y, f]) => (
        <g key={String(x)}>
          <path d={`M35 60 Q${x} 40 ${x} ${Number(y) + 6}`} stroke={P.menta.shade} strokeWidth={4} fill="none" />
          <circle cx={Number(x)} cy={Number(y)} r={10} fill={String(f)} />
          <circle cx={Number(x)} cy={Number(y)} r={4} fill={P.mango.light} />
        </g>
      ))}
      <path d="M20 56 Q14 80 24 100 L46 100 Q56 80 50 56 Z" fill={c.base} />
      <path d="M40 56 L50 56 Q56 80 46 100 L38 100 Q46 80 40 56 Z" fill={c.shade} />
    </g>
  ),
}

export const quadreSol: FurnitureDef = {
  id: 'quadre-sol',
  name: 'Quadre del sol',
  price: 10,
  w: 100,
  h: 80,
  color: 'mango',
  wall: true,
  room: 'sala',
  render: () => (
    <g>
      <rect x={0} y={0} width={100} height={80} rx={8} fill={P.xocolata.base} />
      <rect x={8} y={8} width={84} height={64} rx={4} fill="#BFE6FF" />
      <circle cx={66} cy={30} r={12} fill={P.mango.base} />
      <path d="M8 60 Q40 38 92 56 L92 72 L8 72 Z" fill={P.llima.base} />
    </g>
  ),
}

export const quadreMuntanya: FurnitureDef = {
  id: 'quadre-muntanya',
  name: 'Quadre de la muntanya',
  price: 14,
  w: 120,
  h: 90,
  color: 'lila',
  wall: true,
  room: 'habitacio',
  render: () => (
    <g>
      <rect x={0} y={0} width={120} height={90} rx={10} fill={P.neu.base} />
      <rect x={8} y={8} width={104} height={74} rx={6} fill={P.rosa.light} />
      <path d="M8 82 L44 30 L66 58 L82 40 L112 82 Z" fill={P.lila.base} />
      <path d="M44 30 L54 44 L36 44 Z" fill="#fff" />
      <circle cx={92} cy={24} r={8} fill={P.neu.light} />
    </g>
  ),
}

export const rellotge: FurnitureDef = {
  id: 'rellotge',
  name: 'Rellotge de paret',
  price: 18,
  w: 70,
  h: 70,
  color: 'coral',
  recolourable: true,
  wall: true,
  room: 'cuina',
  render: ({ c }) => (
    <g>
      <circle cx={35} cy={35} r={35} fill={c.base} />
      <circle cx={35} cy={35} r={27} fill={P.neu.base} />
      {[0, 90, 180, 270].map((a) => (
        <rect key={a} x={33.5} y={10} width={3} height={7} rx={1.5} fill={P.carbo.light} transform={`rotate(${a} 35 35)`} />
      ))}
      <rect x={33.5} y={18} width={3} height={18} rx={1.5} fill={P.carbo.base} />
      <rect x={34} y={33.5} width={14} height={3} rx={1.5} fill={P.carbo.base} />
      <circle cx={35} cy={35} r={3} fill={c.shade} />
    </g>
  ),
}

export const garlanda: FurnitureDef = {
  id: 'garlanda-llums',
  name: 'Garlanda de llums',
  price: 16,
  w: 200,
  h: 50,
  color: 'mango',
  wall: true,
  action: 'lamp',
  room: 'habitacio',
  render: ({ lit }) => {
    const bulbs = [P.coral.base, P.mango.base, P.menta.base, P.cel.base, P.rosa.base, P.lila.base]
    return (
      <g>
        <path d="M0 6 Q100 40 200 6" stroke={P.carbo.light} strokeWidth={2} fill="none" />
        {bulbs.map((b, k) => {
          const x = 18 + k * 33
          const y = 6 + 34 * (1 - ((x - 100) / 100) ** 2) * 0.5 + 4
          return (
            <g key={b}>
              {lit && <circle cx={x} cy={y + 8} r={12} fill={b} opacity={0.3} />}
              <ellipse cx={x} cy={y + 8} rx={6} ry={8} fill={lit ? b : P.neu.shade} />
            </g>
          )
        })}
      </g>
    )
  },
}

export const DECOR: readonly FurnitureDef[] = [lampadaPeu, lampadaTaula, plantaTest, cactus, gerroFlors, quadreSol, quadreMuntanya, rellotge, garlanda]
