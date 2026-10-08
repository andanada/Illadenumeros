import type { ReactElement } from 'react'
import { INK, PALETTE, SKIN } from '../../art/palette'
import { sparklePath } from '../../art/paths'
import type { CreatorTab } from './creatorReducer'

/** Flat category icons for the creator tabs (40 × 40, same no-outline style as the world). */
const ICONS: Readonly<Record<CreatorTab, ReactElement>> = {
  pell: (
    <g>
      <circle cx={14} cy={22} r={10} fill={SKIN.s1.base} />
      <circle cx={26} cy={22} r={10} fill={SKIN.s4.base} />
      <circle cx={20} cy={14} r={10} fill={SKIN.s6.base} />
    </g>
  ),
  cabell: (
    <g>
      <circle cx={20} cy={22} r={13} fill={SKIN.s2.base} />
      <path d="M6 24 C4 6 36 6 34 24 C30 16 24 14 20 18 C16 14 10 16 6 24 Z" fill={PALETTE.xocolata.base} />
      <path d="M6 22 C2 30 4 36 8 38 C10 32 8 28 10 24 Z" fill={PALETTE.xocolata.shade} />
    </g>
  ),
  cara: (
    <g>
      <circle cx={20} cy={20} r={16} fill={PALETTE.mango.base} />
      <circle cx={14} cy={18} r={2.6} fill={INK.face} />
      <circle cx={26} cy={18} r={2.6} fill={INK.face} />
      <path d="M13 25 Q20 31 27 25" stroke={INK.face} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <ellipse cx={10} cy={24} rx={3} ry={2} fill={INK.blush} opacity={0.6} />
      <ellipse cx={30} cy={24} rx={3} ry={2} fill={INK.blush} opacity={0.6} />
    </g>
  ),
  dalt: (
    <g>
      <path d="M4 12 L14 5 Q20 10 26 5 L36 12 L32 20 L28 18 L28 36 L12 36 L12 18 L8 20 Z" fill={PALETTE.coral.base} />
      <path d="M17 18 L20 22 L23 18 L23 27 L17 27 Z" fill={PALETTE.neu.base} opacity={0.9} />
    </g>
  ),
  baix: (
    <g>
      <path d="M9 5 L31 5 L34 36 L23 36 L20 16 L17 36 L6 36 Z" fill={PALETTE.cel.base} />
      <rect x={9} y={5} width={22} height={6} rx={2} fill={PALETTE.cel.shade} />
    </g>
  ),
  sabates: (
    <g>
      <path d="M4 30 Q3 16 14 16 Q20 16 22 22 Q34 22 36 30 Z" fill={PALETTE.lila.base} />
      <rect x={3} y={28} width={34} height={6} rx={3} fill={PALETTE.neu.base} />
      <path d="M12 21 l6 0 M13 25 l6 0" stroke={PALETTE.neu.base} strokeWidth={2} strokeLinecap="round" />
    </g>
  ),
  complements: (
    <g>
      <path d="M20 20 C14 8 2 10 4 20 C6 30 16 26 20 20 Z M20 20 C26 8 38 10 36 20 C34 30 24 26 20 20 Z" fill={PALETTE.rosa.base} />
      <ellipse cx={20} cy={20} rx={5} ry={6} fill={PALETTE.rosa.shade} />
      <path d={sparklePath(33, 7, 5)} fill={PALETTE.mango.base} />
    </g>
  ),
}

export function TabIcon({ tab, size = 40 }: { tab: CreatorTab; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      {ICONS[tab]}
    </svg>
  )
}

/** A die with a sparkle, for the "Sorpresa!" button. */
export function DiceIcon({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <rect x={4} y={6} width={30} height={30} rx={9} fill={PALETTE.neu.base} />
      <rect x={4} y={30} width={30} height={6} rx={3} fill={PALETTE.neu.shade} />
      {[
        [12, 14],
        [26, 14],
        [19, 21],
        [12, 28],
        [26, 28],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill={PALETTE.coral.base} />
      ))}
      <path d={sparklePath(35, 6, 5)} fill={PALETTE.mango.light} />
    </svg>
  )
}
