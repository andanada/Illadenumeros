import { PALETTE } from '../../art/palette'
import { byId, type PartCtx, type ShoeDef } from './geometry'

/**
 * Shoes, one foot at a time. (x, y) is the centre of the sole line; `side` points the toe outwards
 * a touch so the stance reads as relaxed and cheeky.
 */

const sole = PALETTE.neu.base

const bambes: ShoeDef = {
  id: 'bambes',
  name: 'Bambes',
  foot: ({ c }, x, y, side) => (
    <g>
      <path d={`M${x - 13} ${y} Q${x - 14} ${y - 15} ${x} ${y - 15} Q${x + 12 + side * 3} ${y - 14} ${x + 14 + side * 3} ${y} Z`} fill={c.base} />
      <rect x={x - 14} y={y - 4} width={29 + Math.abs(side) * 2} height={7} rx={3.5} fill={sole} />
      <path d={`M${x - 5} ${y - 12} l8 0 M${x - 5} ${y - 8} l9 0`} stroke={sole} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  ),
}

const botes: ShoeDef = {
  id: 'botes',
  name: 'Botes',
  foot: ({ c }, x, y, side) => (
    <g>
      <path d={`M${x - 12} ${y} L${x - 12} ${y - 26} Q${x} ${y - 30} ${x + 11} ${y - 26} L${x + 11} ${y - 12} Q${x + 15 + side * 3} ${y - 10} ${x + 15 + side * 3} ${y} Z`} fill={c.base} />
      <rect x={x - 14} y={y - 30} width={27} height={7} rx={3.5} fill={c.light} />
      <rect x={x - 13} y={y - 4} width={29} height={6} rx={3} fill={c.shade} />
    </g>
  ),
}

const sandalies: ShoeDef = {
  id: 'sandalies',
  name: 'Sandàlies',
  foot: ({ c, skin }, x, y, side) => (
    <g>
      <path d={`M${x - 12} ${y} Q${x - 12} ${y - 13} ${x} ${y - 13} Q${x + 12 + side * 2} ${y - 12} ${x + 13 + side * 2} ${y} Z`} fill={skin.base} />
      <rect x={x - 14} y={y - 4} width={29} height={6} rx={3} fill={c.shade} />
      <path d={`M${x - 10} ${y - 6} L${x + 10} ${y - 10} M${x - 8} ${y - 11} L${x + 10} ${y - 4}`} stroke={c.base} strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
}

const sabates: ShoeDef = {
  id: 'sabates',
  name: 'Sabates',
  foot: ({ c }, x, y, side) => (
    <g>
      <path d={`M${x - 13} ${y} Q${x - 14} ${y - 12} ${x} ${y - 12} Q${x + 13 + side * 3} ${y - 12} ${x + 14 + side * 3} ${y} Z`} fill={c.base} />
      <path d={`M${x - 9} ${y - 12} L${x + 8} ${y - 12}`} stroke={c.shade} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={x + side * 6} cy={y - 12} r={2.4} fill={PALETTE.mango.light} />
      <ellipse cx={x - 4} cy={y - 7} rx={4} ry={2} fill={c.light} opacity={0.8} />
    </g>
  ),
}

const botesPluja: ShoeDef = {
  id: 'botes-pluja',
  name: 'Botes de pluja',
  foot: ({ c }, x, y, side) => (
    <g>
      <path d={`M${x - 13} ${y} L${x - 13} ${y - 34} Q${x} ${y - 38} ${x + 12} ${y - 34} L${x + 12} ${y - 12} Q${x + 16 + side * 3} ${y - 10} ${x + 16 + side * 3} ${y} Z`} fill={c.base} />
      <rect x={x - 9} y={y - 32} width={4} height={20} rx={2} fill={c.light} opacity={0.85} />
      <rect x={x - 14} y={y - 4} width={31} height={6} rx={3} fill={c.shade} />
    </g>
  ),
}

const sabatilles: ShoeDef = {
  id: 'sabatilles',
  name: 'Sabatilles',
  foot: ({ c }: PartCtx, x, y, side) => (
    <g>
      <path d={`M${x - 14} ${y} Q${x - 15} ${y - 14} ${x} ${y - 14} Q${x + 14 + side * 3} ${y - 14} ${x + 15 + side * 3} ${y} Z`} fill={c.base} />
      <circle cx={x + side * 3} cy={y - 14} r={6} fill={c.light} />
      <rect x={x - 14} y={y - 3} width={30} height={5} rx={2.5} fill={c.shade} />
    </g>
  ),
}

export const SHOES: readonly ShoeDef[] = [bambes, botes, sandalies, sabates, botesPluja, sabatilles]
export const SHOES_BY_ID = byId(SHOES)
