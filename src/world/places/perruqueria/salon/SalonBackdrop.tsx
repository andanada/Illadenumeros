import { PALETTE as P } from '../../../art/palette'

const WALL = '#FFE3EE'
const STRIPE = '#FFD3E5'

/** The salon room, all decorative: pink wallpaper with little scissors, bunting, black-and-white floor. */
export function SalonBackdrop() {
  const flags = Array.from({ length: 16 }, (_, i) => i)
  const colours = [P.rosa.base, P.neu.base, P.cel.base, P.mango.base, P.lila.base]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="salo-paper" width="64" height="64" patternUnits="userSpaceOnUse">
            <rect width="64" height="64" fill={WALL} />
            <rect width="22" height="64" fill={STRIPE} />
            <g transform="translate(44 16)">
              <circle cx="-3" cy="0" r="3" fill="none" stroke={P.rosa.base} strokeWidth="1.6" />
              <circle cx="3" cy="0" r="3" fill="none" stroke={P.rosa.base} strokeWidth="1.6" />
              <path d="M-3 -3 L6 -12 M3 -3 L-6 -12" stroke={P.rosa.shade} strokeWidth="1.6" strokeLinecap="round" />
            </g>
            <circle cx="44" cy="46" r="3.2" fill={P.cel.light} />
          </pattern>
          <pattern id="salo-floor" width="80" height="80" patternUnits="userSpaceOnUse">
            <rect width="80" height="80" fill={P.neu.base} />
            <rect width="40" height="40" fill={P.carbo.light} />
            <rect x="40" y="40" width="40" height="40" fill={P.carbo.light} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#salo-paper)" />
      </svg>
      <svg viewBox="0 0 800 40" preserveAspectRatio="none" className="absolute inset-x-0 top-[72px] h-8 w-full sm:top-[84px]">
        <path d="M0 4 Q400 26 800 4" stroke={P.carbo.light} strokeWidth="2" fill="none" />
        {flags.map((i) => {
          const x = 25 + i * 50
          const y = 4 + 22 * (1 - ((x - 400) / 400) ** 2) * 0.5
          return <path key={i} d={`M${x - 14} ${y} L${x + 14} ${y} L${x} ${y + 26} Z`} fill={colours[i % colours.length]} />
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-[26%]">
        <div className="absolute inset-x-0 -top-10 h-10" style={{ background: P.rosa.shade }}>
          <div className="absolute inset-x-0 top-0 h-2" style={{ background: P.rosa.light }} />
        </div>
        <svg className="absolute inset-0 h-full w-full">
          <rect width="100%" height="100%" fill="url(#salo-floor)" />
        </svg>
      </div>
    </div>
  )
}
