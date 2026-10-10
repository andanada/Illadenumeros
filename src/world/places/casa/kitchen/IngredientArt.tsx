import { memo } from 'react'
import { PALETTE as P } from '../../../art/palette'
import type { Ingredient } from './ingredients'

/** Small flat ingredients (no outlines, light from the upper left), drawn in a 40 × 40 box. */
function Maduixa() {
  return (
    <g>
      <path d="M20 38 C8 30 4 18 8 12 C12 7 28 7 32 12 C36 18 32 30 20 38 Z" fill={P.coral.base} />
      <path d="M28 11 C35 16 32 30 20 38 C27 28 30 20 28 11 Z" fill={P.coral.shade} />
      {[
        [14, 17],
        [22, 16],
        [17, 24],
        [25, 23],
        [20, 30],
      ].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={1.2} ry={1.8} fill={P.mango.light} />
      ))}
      <path d="M10 11 Q14 4 20 8 Q26 4 30 11 Q24 9 20 12 Q16 9 10 11 Z" fill={P.llima.shade} />
      <rect x={18.5} y={2} width={3} height={7} rx={1.5} fill={P.llima.shade} />
    </g>
  )
}

function Nabiu() {
  return (
    <g>
      <circle cx={20} cy={22} r={15} fill={P.lila.shade} />
      <circle cx={18} cy={20} r={13} fill={P.lila.base} />
      <circle cx={13} cy={15} r={3.2} fill={P.lila.light} />
      <path d="M15 9 L20 13 L25 9 L23 15 L17 15 Z" fill={P.carbo.light} />
    </g>
  )
}

function Galeta() {
  return (
    <g>
      <circle cx={20} cy={21} r={17} fill="#C98337" />
      <circle cx={19} cy={20} r={15} fill="#E7A55A" />
      {[
        [13, 15],
        [24, 14],
        [16, 26],
        [26, 24],
        [20, 20],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={2.4} fill={P.xocolata.shade} />
      ))}
    </g>
  )
}

function Ou() {
  return (
    <g>
      <path d="M20 2 C29 2 35 16 35 25 C35 34 28 39 20 39 C12 39 5 34 5 25 C5 16 11 2 20 2 Z" fill={P.neu.shade} />
      <path d="M19 2 C27 2 32 15 32 24 C32 32 26 37 19 37 C11 37 6 32 6 24 C6 15 11 2 19 2 Z" fill={P.neu.base} />
      <ellipse cx={13} cy={15} rx={3} ry={5} fill={P.neu.light} transform="rotate(20 13 15)" />
    </g>
  )
}

function Tovallola() {
  return (
    <g>
      <rect x={6} y={8} width={28} height={26} rx={5} fill={P.cel.base} />
      <rect x={6} y={8} width={28} height={8} rx={4} fill={P.cel.light} />
      <rect x={6} y={26} width={28} height={8} rx={4} fill={P.cel.shade} />
      {[10, 16, 22, 28].map((x) => (
        <rect key={x} x={x} y={32} width={2.4} height={6} rx={1.2} fill={P.cel.light} />
      ))}
    </g>
  )
}

function Croqueta() {
  return (
    <g>
      <path d="M8 24 C6 12 16 6 26 8 C36 10 36 24 30 30 C24 36 10 34 8 24 Z" fill={P.xocolata.light} />
      <path d="M30 30 C24 36 10 34 8 24 C16 32 26 30 32 20 C34 24 33 27 30 30 Z" fill={P.xocolata.base} />
      <circle cx={16} cy={16} r={2} fill={P.mango.light} />
      <circle cx={24} cy={20} r={1.6} fill={P.mango.light} />
    </g>
  )
}

const ART = { maduixa: Maduixa, nabiu: Nabiu, galeta: Galeta, ou: Ou, tovallola: Tovallola, croqueta: Croqueta } as const

/** One ingredient as a decorative svg of `size` px. */
export const IngredientArt = memo(function IngredientArt({ id, size = 32 }: { id: Ingredient['id']; size?: number }) {
  const Art = ART[id]
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" className="pointer-events-none block overflow-visible">
      <Art />
    </svg>
  )
})
