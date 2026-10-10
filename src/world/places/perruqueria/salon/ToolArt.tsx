import { PALETTE as P, swatch } from '../../../art/palette'
import type { PaletteColor } from '../../../model/types'
import type { Tool } from '../styling/styleLogic'

/** The six salon tools, flat and outline-free, each in a 60 × 60 box. */
function Scissors() {
  return (
    <g>
      <path d="M14 8 L34 38 L28 42 L10 14 Z" fill={P.neu.shade} />
      <path d="M46 8 L26 38 L32 42 L50 14 Z" fill={P.neu.base} />
      <circle cx="17" cy="48" r="9" fill="none" stroke={P.coral.base} strokeWidth="5" />
      <circle cx="43" cy="48" r="9" fill="none" stroke={P.coral.shade} strokeWidth="5" />
      <circle cx="30" cy="38" r="3" fill={P.mango.base} />
    </g>
  )
}

function Dryer() {
  return (
    <g>
      <rect x="22" y="34" width="14" height="24" rx="6" fill={P.carbo.base} transform="rotate(-14 29 46)" />
      <path d="M6 18 Q6 6 24 6 L46 10 Q54 12 54 22 Q54 32 46 34 L24 36 Q6 34 6 18 Z" fill={P.cel.base} />
      <path d="M30 6 L46 10 Q54 12 54 22 Q54 32 46 34 L36 35 Q44 20 30 6 Z" fill={P.cel.shade} />
      <rect x="50" y="12" width="8" height="20" rx="4" fill={P.carbo.light} />
      <circle cx="20" cy="18" r="4" fill={P.cel.light} />
    </g>
  )
}

function Spray({ color }: { color: PaletteColor }) {
  const c = swatch(color)
  return (
    <g>
      <rect x="16" y="22" width="28" height="36" rx="8" fill={c.base} />
      <rect x="34" y="22" width="10" height="36" rx="6" fill={c.shade} />
      <rect x="20" y="28" width="12" height="6" rx="3" fill={c.light} />
      <rect x="22" y="10" width="16" height="14" rx="4" fill={P.neu.base} />
      <rect x="36" y="4" width="14" height="8" rx="3" fill={P.carbo.light} />
      <circle cx="54" cy="6" r="2" fill={c.base} />
      <circle cx="58" cy="12" r="1.6" fill={c.base} />
    </g>
  )
}

function Clips() {
  return (
    <g>
      <rect x="4" y="30" width="48" height="14" rx="7" fill={P.rosa.shade} />
      <rect x="4" y="26" width="48" height="14" rx="7" fill={P.rosa.base} />
      <path d="M28 22 Q12 6 10 20 Q14 30 28 22 Z" fill={P.neu.base} />
      <path d="M28 22 Q44 6 46 20 Q42 30 28 22 Z" fill={P.neu.shade} />
      <circle cx="28" cy="22" r="5" fill={P.rosa.light} />
    </g>
  )
}

/** A shower head with water drops. */
function Shower() {
  return (
    <g>
      <rect x="26" y="4" width="8" height="22" rx="4" fill={P.carbo.light} transform="rotate(20 30 14)" />
      <ellipse cx="30" cy="30" rx="20" ry="9" fill={P.cel.base} />
      <ellipse cx="30" cy="27" rx="20" ry="8" fill={P.cel.light} />
      {[16, 26, 36, 46].map((x) => (
        <rect key={x} x={x - 3} y="42" width="4" height="12" rx="2" fill={P.cel.base} />
      ))}
    </g>
  )
}

function Comb() {
  return (
    <g>
      <rect x="4" y="14" width="52" height="14" rx="7" fill={P.mango.base} />
      <rect x="4" y="14" width="52" height="6" rx="3" fill={P.mango.light} />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={8 + i * 5.2} y="26" width="3" height="22" rx="1.5" fill={P.mango.shade} />
      ))}
    </g>
  )
}

export function ToolArt({ tool, size = 56, spray = 'rosa' }: { tool: Tool; size?: number; spray?: PaletteColor }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} aria-hidden="true" className="pointer-events-none block overflow-visible">
      {tool === 'tisores' && <Scissors />}
      {tool === 'assecador' && <Dryer />}
      {tool === 'esprai' && <Spray color={spray} />}
      {tool === 'pinces' && <Clips />}
      {tool === 'dutxa' && <Shower />}
      {tool === 'pinta' && <Comb />}
    </svg>
  )
}
