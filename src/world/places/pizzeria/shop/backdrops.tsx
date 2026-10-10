import { INK, PALETTE as P } from '../../../art/palette'
import { Piece } from '../../../sandbox/art/roomArt'
import { RoomShell } from '../../shared/doing/RoomShell'

function Table({ x, y }: { x: number; y: number }) {
  return (
    <Piece x={x} y={y} h={0.14} ratio={1.5}>
      <ellipse cx="75" cy="96" rx="64" ry="4" fill={INK.shadow} opacity="0.16" />
      <rect x="66" y="38" width="18" height="56" rx="5" fill={P.carbo.light} />
      <ellipse cx="75" cy="32" rx="68" ry="22" fill={P.coral.shade} />
      <ellipse cx="75" cy="28" rx="68" ry="22" fill={P.neu.base} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${20 + i * 30} 12 H${35 + i * 30} L${40 + i * 30} 44 H${25 + i * 30}Z`} fill={P.coral.base} opacity="0.55" />
      ))}
    </Piece>
  )
}

/** The dining room: red-and-cream tiles, a window, tables with checked cloths, and the counter with the tip jar. */
export function DiningBackdrop() {
  return (
    <div className="absolute inset-0">
      <RoomShell wall="#FFE9D6" wall2="#FFD6B8" floor="#F7EBD7" floor2="#E9B4A6" trim={P.coral.base} tiles={6} />
      <Piece x={0.3} y={0.4} h={0.26} ratio={1.3}>
        <rect width="130" height="100" rx="10" fill={P.neu.base} />
        <rect x="8" y="8" width="114" height="84" rx="6" fill={P.cel.light} />
        <rect x="62" y="8" width="5" height="84" fill={P.neu.base} />
        <path d="M18 24 l24 -8" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
      </Piece>
      <div className="absolute left-[6%] top-[3%] rounded-b-2xl px-5 py-1 text-xs font-bold tracking-widest text-white sm:text-sm" style={{ background: P.coral.base }}>
        PIZZERIA
      </div>
      <Piece x={0.78} y={0.5} h={0.18} ratio={1.5}>
        <ellipse cx="75" cy="97" rx="70" ry="4" fill={INK.shadow} opacity="0.16" />
        <rect x="0" y="0" width="150" height="20" rx="8" fill="#F4D3A6" />
        <rect x="4" y="20" width="142" height="76" fill={P.coral.base} />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={4 + i * 30} y="20" width="15" height="76" fill={P.neu.base} opacity="0.9" />
        ))}
      </Piece>
      <Table x={0.38} y={0.8} />
      <Table x={0.62} y={0.8} />
    </div>
  )
}

/** The kitchen: stone wall, the wood-fired oven, a long steel table. */
export function KitchenBackdrop() {
  return (
    <div className="absolute inset-0">
      <RoomShell wall="#F0E2D2" wall2="#E3CFB8" floor="#A89484" floor2="#9A8676" trim="#C9843A" tiles={10} />
      <Piece x={0.75} y={0.47} h={0.4} ratio={1.1}>
        <ellipse cx="55" cy="97" rx="52" ry="4" fill={INK.shadow} opacity="0.16" />
        <path d="M0 100 V50 Q0 4 55 4 Q110 4 110 50 V100Z" fill="#B96F2C" />
        <path d="M8 100 V52 Q8 14 55 14 Q102 14 102 52 V100Z" fill="#D9893F" />
        <path d="M22 92 V58 Q22 30 55 30 Q88 30 88 58 V92Z" fill={P.carbo.shade} />
        <path d="M30 88 V60 Q30 38 55 38 Q80 38 80 60 V88Z" fill="#FF9F2E" />
        <path d="M42 88 Q40 70 50 62 Q52 74 58 66 Q68 76 66 88Z" fill="#FFD28A" />
      </Piece>
      <Piece x={0.2} y={0.47} h={0.32} ratio={1.2}>
        <rect width="120" height="100" rx="6" fill={P.xocolata.shade} />
        <rect x="6" y="6" width="108" height="40" fill="#D9C2A5" />
        <rect x="6" y="52" width="108" height="42" fill="#D9C2A5" />
        {[12, 40, 68, 92].map((x, i) => (
          <rect key={x} x={x} y="14" width="18" height="30" rx="5" fill={[P.coral.base, P.llima.base, P.mango.base, P.cel.light][i]} />
        ))}
      </Piece>
      <Piece x={0.46} y={0.74} h={0.22} ratio={2.6}>
        <ellipse cx="130" cy="97" rx="126" ry="4" fill={INK.shadow} opacity="0.16" />
        <rect x="0" y="0" width="260" height="22" rx="9" fill="#E6EBF0" />
        <rect x="0" y="16" width="260" height="8" fill="#B5BFCA" />
        <rect x="14" y="24" width="12" height="72" rx="4" fill={P.carbo.light} />
        <rect x="234" y="24" width="12" height="72" rx="4" fill={P.carbo.light} />
      </Piece>
    </div>
  )
}

/** The pavement outside: a street and the delivery scooter. */
export function TerraceBackdrop() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(var(--world-sky-top,#8fd3ff), var(--world-sky-bottom,#d7f0ff) 46%)' }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: '46%', background: `linear-gradient(${P.neu.shade}, #CFC3AE)` }} />
      <Piece x={0.64} y={0.7} h={0.34} ratio={1.6}>
        <ellipse cx="80" cy="97" rx="74" ry="4" fill={INK.shadow} opacity="0.2" />
        <circle cx="30" cy="80" r="17" fill={P.carbo.base} />
        <circle cx="30" cy="80" r="8" fill={P.neu.shade} />
        <circle cx="132" cy="80" r="17" fill={P.carbo.base} />
        <circle cx="132" cy="80" r="8" fill={P.neu.shade} />
        <path d="M30 78 Q50 40 84 52 L120 54 L132 78Z" fill={P.coral.base} />
        <rect x="46" y="38" width="42" height="10" rx="5" fill={P.carbo.light} />
        <path d="M118 54 L124 22 H142" stroke={P.carbo.light} strokeWidth="6" strokeLinecap="round" fill="none" />
        <rect x="20" y="14" width="46" height="36" rx="8" fill={P.mango.base} />
        <text x="43" y="38" textAnchor="middle" fontSize="13" fontWeight="700" fill={P.carbo.base} fontFamily="var(--font-display)">
          PIZZA
        </text>
      </Piece>
    </div>
  )
}
