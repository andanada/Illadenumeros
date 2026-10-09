import { PALETTE as P } from '../../../art/palette'

/**
 * The shop's room, all decorative: patterned wallpaper, a wooden wainscot, a plank floor, a window onto the
 * street, hanging lamps and bunting. Same flat, no-outline look as the street. Patterns tile, so any
 * screen shape works; the window keeps its own aspect ratio.
 */

const WALL = '#FFE6BF'
const WALL_STRIPE = '#FFDDAA'
const PLANK = '#C98D5E'
const PLANK_DARK = '#B57849'

function Wallpaper() {
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="botiga-paper" width="64" height="64" patternUnits="userSpaceOnUse">
          <rect width="64" height="64" fill={WALL} />
          <rect x="0" width="22" height="64" fill={WALL_STRIPE} />
          <g transform="translate(43 16)">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-4.5" rx="3" ry="4.5" fill={P.rosa.light} transform={`rotate(${a})`} />
            ))}
            <circle r="2.6" fill={P.mango.base} />
          </g>
          <g transform="translate(43 48)">
            <ellipse cx="-3" cy="0" rx="4" ry="2.2" fill={P.menta.light} transform="rotate(-30)" />
            <ellipse cx="3" cy="0" rx="4" ry="2.2" fill={P.menta.light} transform="rotate(30)" />
          </g>
        </pattern>
        <pattern id="botiga-planks" width="260" height="56" patternUnits="userSpaceOnUse">
          <rect width="260" height="56" fill={PLANK} />
          <rect y="26" width="260" height="2" fill={PLANK_DARK} />
          <rect y="54" width="260" height="2" fill={PLANK_DARK} />
          <rect x="180" width="2" height="26" fill={PLANK_DARK} />
          <rect x="60" y="28" width="2" height="26" fill={PLANK_DARK} />
          <ellipse cx="70" cy="12" rx="22" ry="2" fill="#D9A274" opacity="0.7" />
          <ellipse cx="200" cy="41" rx="18" ry="1.6" fill="#D9A274" opacity="0.7" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#botiga-paper)" />
    </svg>
  )
}

function Floor() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[30%]" aria-hidden="true">
      <div className="absolute inset-x-0 -top-14 h-14" style={{ background: '#E3A877' }}>
        <div className="absolute inset-x-0 top-0 h-2.5" style={{ background: '#F2BE8E' }} />
        <div className="absolute inset-x-0 bottom-0 h-3" style={{ background: P.xocolata.base }} />
      </div>
      <svg className="absolute inset-0 h-full w-full">
        <rect width="100%" height="100%" fill="url(#botiga-planks)" />
      </svg>
    </div>
  )
}

/** The shop window: the street outside, with a sunny hill, a house and a tree. */
export function StreetWindow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 170" className={className} aria-hidden="true">
      <rect x="0" y="0" width="220" height="164" rx="18" fill={P.neu.base} />
      <rect x="12" y="12" width="196" height="138" rx="10" fill="#A9DCFF" />
      <circle cx="164" cy="44" r="18" fill={P.mango.light} />
      <path d="M12 112 Q70 84 130 100 Q176 112 208 92 L208 150 L12 150 Z" fill={P.llima.light} />
      <rect x="40" y="82" width="46" height="44" rx="5" fill={P.rosa.base} />
      <path d="M34 86 L63 62 L92 86 Z" fill={P.coral.shade} />
      <rect x="56" y="104" width="14" height="22" rx="4" fill={P.cel.shade} />
      <rect x="146" y="96" width="8" height="32" rx="3" fill={P.xocolata.base} />
      <circle cx="150" cy="88" r="20" fill={P.llima.base} />
      <rect x="12" y="128" width="196" height="22" fill="#F3E3C3" />
      <rect x="106" y="12" width="8" height="138" fill={P.neu.base} />
      <path d="M12 12 L64 12 Q48 70 30 150 L12 150 Z" fill={P.coral.light} opacity="0.95" />
      <path d="M208 12 L156 12 Q172 70 190 150 L208 150 Z" fill={P.coral.light} opacity="0.95" />
      <path d="M78 26 l22 -10" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
      <rect x="-6" y="150" width="232" height="16" rx="6" fill={P.xocolata.light} />
      <rect x="150" y="128" width="26" height="22" rx="5" fill={P.coral.base} />
      <circle cx="157" cy="122" r="9" fill={P.menta.base} />
      <circle cx="170" cy="118" r="10" fill={P.menta.shade} />
    </svg>
  )
}

function Lamp({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 60 120" className={className} aria-hidden="true">
      <rect x="28.5" y="0" width="3" height="70" fill={P.carbo.light} />
      <path d="M8 96 Q8 66 30 66 Q52 66 52 96 Z" fill={P.menta.base} />
      <path d="M30 66 Q52 66 52 96 L36 96 Q38 74 30 66 Z" fill={P.menta.shade} />
      <ellipse cx="30" cy="99" rx="9" ry="6" fill="#FFF3B0" />
    </svg>
  )
}

function Bunting() {
  const flags = Array.from({ length: 16 }, (_, i) => i)
  const colours = [P.coral.base, P.mango.base, P.menta.base, P.cel.base, P.rosa.base]
  return (
    <svg viewBox="0 0 800 40" preserveAspectRatio="none" className="absolute inset-x-0 top-[72px] h-8 w-full sm:top-[84px]" aria-hidden="true">
      <path d="M0 4 Q400 26 800 4" stroke={P.carbo.light} strokeWidth="2" fill="none" />
      {flags.map((i) => {
        const x = 25 + i * 50
        const y = 4 + 22 * (1 - ((x - 400) / 400) ** 2) * 0.5
        return <path key={i} d={`M${x - 14} ${y} L${x + 14} ${y} L${x} ${y + 26} Z`} fill={colours[i % colours.length]} />
      })}
    </svg>
  )
}

/** Full-size, non-interactive room behind everything in the shop. */
export function RoomBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <Wallpaper />
      <Bunting />
      <Lamp className="absolute left-[38%] top-0 hidden h-28 landscape:block" />
      <Lamp className="absolute left-[74%] top-0 hidden h-24 landscape:block" />
      <Floor />
    </div>
  )
}
