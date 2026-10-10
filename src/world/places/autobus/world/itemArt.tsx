import { PALETTE as P } from '../../../art/palette'
import { Contact } from '../../../sandbox/art/foodArt'

export function SuitcaseArt() {
  return (
    <g>
      <Contact rx={32} />
      <rect x="30" y="14" width="40" height="14" rx="7" fill="none" stroke={P.carbo.base} strokeWidth="5" />
      <rect x="14" y="26" width="72" height="66" rx="12" fill={P.cel.shade} />
      <rect x="14" y="24" width="72" height="66" rx="12" fill={P.cel.base} />
      <rect x="14" y="52" width="72" height="6" fill={P.cel.shade} opacity="0.6" />
      <rect x="44" y="46" width="12" height="16" rx="4" fill={P.mango.base} />
      <circle cx="26" cy="95" r="4" fill={P.carbo.base} />
      <circle cx="74" cy="95" r="4" fill={P.carbo.base} />
    </g>
  )
}

export function BoneArt() {
  return (
    <g>
      <Contact rx={30} />
      <g transform="rotate(-18 50 70)">
        <rect x="24" y="62" width="52" height="16" rx="8" fill={P.neu.base} />
        <circle cx="22" cy="62" r="9" fill={P.neu.base} />
        <circle cx="22" cy="80" r="9" fill={P.neu.base} />
        <circle cx="78" cy="62" r="9" fill={P.neu.base} />
        <circle cx="78" cy="80" r="9" fill={P.neu.base} />
        <rect x="28" y="64" width="44" height="5" rx="2.5" fill="#fff" opacity="0.7" />
      </g>
    </g>
  )
}

export function IceCreamArt() {
  return (
    <g>
      <Contact rx={22} />
      <path d="M32 52 L50 96 L68 52 Z" fill={P.xocolata.light} />
      <path d="M38 62 L62 62 M42 74 L58 74" stroke={P.xocolata.base} strokeWidth="3" opacity="0.5" />
      <circle cx="50" cy="42" r="22" fill={P.rosa.base} />
      <circle cx="50" cy="26" r="15" fill={P.rosa.light} />
      <circle cx="58" cy="20" r="5" fill="#fff" opacity="0.5" />
      <circle cx="56" cy="8" r="5" fill={P.coral.base} />
    </g>
  )
}
