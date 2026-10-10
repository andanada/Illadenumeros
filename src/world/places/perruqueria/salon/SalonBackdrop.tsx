import { INK, PALETTE as P } from '../../../art/palette'
import { Piece } from '../../../sandbox/art/roomArt'

const WALL = '#FFE3EE'
const STRIPE = '#FFD3E5'
const FLOOR_TOP = '46%'

/** A hairdresser's chair seen from the front: round seat, high back, a pole and a base. */
function Chair({ x, y, tone }: { x: number; y: number; tone: 'rosa' | 'cel' }) {
  const c = P[tone]
  return (
    <Piece x={x} y={y + 0.03} h={0.3} ratio={0.8}>
      <ellipse cx="40" cy="96" rx="34" ry="5" fill={INK.shadow} opacity="0.16" />
      <rect x="10" y="4" width="60" height="58" rx="24" fill={c.shade} />
      <rect x="14" y="6" width="52" height="52" rx="22" fill={c.base} />
      <rect x="6" y="52" width="68" height="20" rx="10" fill={c.shade} />
      <rect x="6" y="46" width="68" height="20" rx="10" fill={c.light} />
      <rect x="35" y="68" width="10" height="20" fill={P.carbo.light} />
      <rect x="14" y="86" width="52" height="8" rx="4" fill={P.carbo.base} />
      <rect x="56" y="30" width="14" height="6" rx="3" fill={P.carbo.light} />
    </Piece>
  )
}

function Basin({ x, y }: { x: number; y: number }) {
  return (
    <Piece x={x} y={y} h={0.24} ratio={1.1}>
      <ellipse cx="55" cy="96" rx="48" ry="5" fill={INK.shadow} opacity="0.16" />
      <rect x="6" y="46" width="98" height="46" rx="12" fill={P.neu.shade} />
      <rect x="6" y="40" width="98" height="46" rx="12" fill={P.neu.base} />
      <ellipse cx="55" cy="46" rx="38" ry="10" fill={P.cel.light} />
      <rect x="50" y="8" width="8" height="30" rx="4" fill={P.carbo.light} />
      <path d="M54 10 Q80 4 82 22" stroke={P.carbo.light} strokeWidth="7" strokeLinecap="round" fill="none" />
    </Piece>
  )
}

function Sofa({ x, y }: { x: number; y: number }) {
  return (
    <Piece x={x} y={y} h={0.22} ratio={2.1}>
      <ellipse cx="105" cy="97" rx="102" ry="6" fill={INK.shadow} opacity="0.16" />
      <rect x="14" y="2" width="182" height="62" rx="26" fill={P.lila.shade} />
      <rect x="22" y="8" width="166" height="52" rx="22" fill={P.lila.base} />
      <rect x="22" y="48" width="166" height="38" rx="14" fill={P.lila.shade} />
      <rect x="26" y="40" width="158" height="38" rx="16" fill={P.lila.light} />
      <path d="M105 42 V78" stroke={P.lila.base} strokeWidth="3" opacity="0.6" />
    </Piece>
  )
}

/** The salon: wallpaper, bunting, the checkered floor, two chairs, the wash basin, the waiting sofa and a rug for the tools. */
export function SalonBackdrop() {
  const flags = Array.from({ length: 16 }, (_, i) => i)
  const colours = [P.rosa.base, P.neu.base, P.cel.base, P.mango.base, P.lila.base]
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg className="absolute inset-x-0 top-0 w-full" style={{ height: FLOOR_TOP }} preserveAspectRatio="none">
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
      <div className="absolute inset-x-0" style={{ top: '43%', height: '3.4%', background: P.rosa.shade }}>
        <div className="absolute inset-x-0 top-0 h-1/3" style={{ background: P.rosa.light }} />
      </div>
      <svg className="absolute inset-x-0 bottom-0 w-full" style={{ top: FLOOR_TOP, height: '54%' }}>
        <rect width="100%" height="100%" fill="url(#salo-floor)" />
      </svg>
      <div className="absolute inset-x-0 bottom-0" style={{ top: FLOOR_TOP, background: 'linear-gradient(rgba(43,36,64,0.16), rgba(43,36,64,0) 22%)' }} />
      <svg viewBox="0 0 800 40" preserveAspectRatio="none" className="absolute inset-x-0 top-[1%] h-[5%] w-full">
        <path d="M0 4 Q400 26 800 4" stroke={P.carbo.light} strokeWidth="2" fill="none" />
        {flags.map((i) => {
          const x = 25 + i * 50
          const y = 4 + 22 * (1 - ((x - 400) / 400) ** 2) * 0.5
          return <path key={i} d={`M${x - 14} ${y} L${x + 14} ${y} L${x} ${y + 26} Z`} fill={colours[i % colours.length]} />
        })}
      </svg>
      <Piece x={0.5} y={0.94} h={0.1} ratio={6}>
        <rect x="0" y="6" width="600" height="92" rx="44" fill={P.menta.shade} opacity="0.55" />
        <rect x="10" y="0" width="580" height="86" rx="40" fill={P.menta.light} opacity="0.7" />
      </Piece>
      <Basin x={0.17} y={0.66} />
      <Chair x={0.36} y={0.7} tone="rosa" />
      <Chair x={0.64} y={0.7} tone="cel" />
      <Sofa x={0.85} y={0.66} />
    </div>
  )
}
