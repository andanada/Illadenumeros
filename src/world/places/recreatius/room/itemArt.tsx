import { INK, PALETTE as P } from '../../../art/palette'
import { PROPS_BY_ID } from '../../../art/props'
import { Contact } from '../../../sandbox/art/foodArt'

/** A library prop drawn inside an object's 100 × 100 box, feet at the bottom centre. */
export function PropGlyph({ id }: { id: string }) {
  const def = PROPS_BY_ID[id]
  if (!def) return null
  const k = 92 / def.h
  return (
    <g transform={`translate(${50 - (def.w * k) / 2} ${96 - def.h * k}) scale(${k})`}>
      <Contact rx={22 / k} />
      {def.render({})}
    </g>
  )
}

export function PuckArt() {
  return (
    <g>
      <Contact rx={24} />
      <ellipse cx="50" cy="78" rx="30" ry="12" fill={P.carbo.base} />
      <ellipse cx="50" cy="72" rx="30" ry="12" fill={P.coral.base} />
      <ellipse cx="50" cy="72" rx="18" ry="6.5" fill={P.coral.light} />
    </g>
  )
}

export function TrayArt({ open }: { open: boolean }) {
  return (
    <g>
      <Contact rx={44} />
      <rect x="6" y="46" width="88" height="46" rx="10" fill={P.rosa.shade} />
      <rect x="12" y="52" width="76" height="34" rx="7" fill={INK.shadow} opacity="0.55" />
      <path d={open ? 'M10 46 L90 46 L96 28 L4 28 Z' : 'M6 46 H94 V70 H6 Z'} fill={P.rosa.base} />
      <rect x="40" y="34" width="20" height="8" rx="4" fill="#fff" opacity="0.7" />
      <text x="50" y="86" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="var(--font-display)">
        PREMIS
      </text>
    </g>
  )
}

/** A prize ticket: a striped strip with a notch, for the clerk's counts. */
export function TicketArt() {
  return (
    <g>
      <Contact rx={26} />
      <rect x="14" y="40" width="72" height="44" rx="8" fill={P.mango.base} transform="rotate(-6 50 62)" />
      <rect x="20" y="46" width="60" height="32" rx="5" fill={P.mango.light} transform="rotate(-6 50 62)" />
      <circle cx="14" cy="64" r="6" fill="#2f2a5a" />
      <circle cx="86" cy="58" r="6" fill="#2f2a5a" />
      <text x="50" y="68" textAnchor="middle" fontSize="16" fontWeight="700" fill={P.carbo.base} fontFamily="var(--font-display)">
        ★
      </text>
    </g>
  )
}
