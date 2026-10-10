import { PALETTE as P } from '../../art/palette'

/** The default door of a room: a rounded wooden door with a knob and a sunny window. */
export function DoorArt() {
  return (
    <svg viewBox="0 0 100 200" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <rect x="2" y="4" width="96" height="196" rx="40" fill={P.xocolata.shade} />
      <rect x="9" y="10" width="82" height="190" rx="34" fill={P.xocolata.base} />
      <rect x="20" y="24" width="60" height="64" rx="28" fill={P.cel.light} />
      <path d="M24 70 Q50 40 76 70" stroke="#fff" strokeWidth="5" fill="none" opacity="0.6" strokeLinecap="round" />
      <rect x="20" y="104" width="60" height="78" rx="14" fill={P.xocolata.shade} opacity="0.35" />
      <circle cx="74" cy="124" r="7" fill={P.mango.base} />
      <circle cx="72" cy="122" r="2.5" fill="#fff" opacity="0.7" />
    </svg>
  )
}
