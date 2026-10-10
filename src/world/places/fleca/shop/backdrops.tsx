import { INK, PALETTE as P } from '../../../art/palette'
import { Piece, PropPiece } from '../../../sandbox/art/roomArt'
import { RoomShell } from '../../shared/doing/RoomShell'

const CRUST = '#D9893F'

function Shelf({ x, y, w, loaves }: { x: number; y: number; w: number; loaves: boolean }) {
  return (
    <Piece x={x} y={y} h={0.2} ratio={w}>
      <rect x="0" y="0" width={w * 100} height="100" rx="8" fill={P.xocolata.shade} />
      <rect x="5" y="6" width={w * 100 - 10} height="40" fill="#F4D3A6" />
      <rect x="5" y="54" width={w * 100 - 10} height="40" fill="#F4D3A6" />
      {Array.from({ length: Math.floor(w * 3) }, (_, i) => (
        <g key={i}>
          {loaves ? <rect x={12 + i * 34} y="22" width="26" height="22" rx="11" fill={CRUST} /> : <ellipse cx={26 + i * 34} cy="38" rx="14" ry="8" fill={CRUST} />}
          <rect x={12 + i * 34} y="70" width="26" height="22" rx="11" fill={loaves ? '#EDA95E' : P.rosa.base} />
        </g>
      ))}
    </Piece>
  )
}

/** The shop: warm wall, a window to the street, shelves of bread and a long counter with a cash till. */
export function ShopBackdrop() {
  return (
    <div className="absolute inset-0">
      <RoomShell wall="#FFE3D0" wall2="#FFD0B0" floor="#F6DDBA" floor2="#EFCFA3" trim={P.rosa.base} tiles={10} />
      <Piece x={0.3} y={0.4} h={0.3} ratio={1.4}>
        <rect width="140" height="100" rx="10" fill={P.neu.base} />
        <rect x="8" y="8" width="124" height="84" rx="6" fill={P.cel.light} />
        <rect x="68" y="8" width="5" height="84" fill={P.neu.base} />
        <path d="M18 24 l26 -8" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
        <path d="M8 8 H132 V24 Q120 34 108 24 Q96 34 84 24 Q72 34 60 24 Q48 34 36 24 Q24 34 8 24Z" fill={P.coral.base} />
      </Piece>
      <Shelf x={0.62} y={0.34} w={2.4} loaves />
      <Shelf x={0.83} y={0.34} w={1.1} loaves={false} />
      <div className="absolute left-[6%] top-[3%] rounded-b-2xl px-5 py-1 text-xs font-bold tracking-widest text-white sm:text-sm" style={{ background: P.coral.base }}>
        FLECA
      </div>
      <PropPiece id="caixa-registradora" x={0.8} y={0.43} h={0.1} />
      <Piece x={0.62} y={0.57} h={0.2} ratio={3}>
        <ellipse cx="150" cy="97" rx="146" ry="5" fill={INK.shadow} opacity="0.16" />
        <rect x="0" y="0" width="300" height="26" rx="10" fill="#F4D3A6" />
        <rect x="0" y="18" width="300" height="8" fill="#D9A06C" />
        <rect x="4" y="26" width="292" height="70" fill={P.rosa.base} />
        {Array.from({ length: 7 }, (_, i) => (
          <rect key={i} x={4 + i * 42} y="26" width="21" height="70" fill={P.neu.base} opacity="0.9" />
        ))}
      </Piece>
    </div>
  )
}

function Oven({ x }: { x: number }) {
  return (
    <Piece x={x} y={0.47} h={0.4} ratio={1.1}>
      <ellipse cx="55" cy="97" rx="52" ry="4" fill={INK.shadow} opacity="0.16" />
      <rect x="0" y="0" width="110" height="100" rx="12" fill={P.carbo.light} />
      <rect x="8" y="8" width="94" height="14" rx="6" fill={P.carbo.base} />
      {[22, 40, 58].map((cx) => (
        <circle key={cx} cx={cx} cy="15" r="4.5" fill={P.mango.base} />
      ))}
      <rect x="12" y="30" width="86" height="62" rx="10" fill={P.carbo.shade} />
      <rect x="18" y="36" width="74" height="50" rx="7" fill="#FFB058" />
      <rect x="18" y="36" width="74" height="16" rx="7" fill="#FFD28A" />
      <rect x="26" y="88" width="58" height="6" rx="3" fill={P.neu.shade} />
    </Piece>
  )
}

/** The bakehouse: tiled wall, the big oven, a cooling rack and a floury work table. */
export function BakehouseBackdrop() {
  return (
    <div className="absolute inset-0">
      <RoomShell wall="#F4EFE6" wall2="#E6DDCD" floor="#B9ABA0" floor2="#AB9D92" trim={P.cel.light} tiles={12} />
      <div className="absolute inset-x-0 top-0" style={{ height: '46%', background: 'repeating-linear-gradient(90deg, rgba(43,36,64,0.05) 0 1px, transparent 1px 7%), repeating-linear-gradient(0deg, rgba(43,36,64,0.05) 0 1px, transparent 1px 11%)' }} />
      <Oven x={0.75} />
      <Piece x={0.2} y={0.47} h={0.36} ratio={0.9}>
        <ellipse cx="45" cy="97" rx="40" ry="4" fill={INK.shadow} opacity="0.16" />
        <rect x="2" y="0" width="86" height="94" rx="6" fill={P.neu.shade} />
        {[18, 44, 70].map((y) => (
          <rect key={y} x="8" y={y} width="74" height="6" rx="3" fill={P.neu.light} />
        ))}
        <rect x="6" y="92" width="8" height="8" rx="3" fill={P.carbo.light} />
        <rect x="76" y="92" width="8" height="8" rx="3" fill={P.carbo.light} />
      </Piece>
      <Piece x={0.48} y={0.72} h={0.22} ratio={2.6}>
        <ellipse cx="130" cy="97" rx="126" ry="4" fill={INK.shadow} opacity="0.16" />
        <rect x="0" y="0" width="260" height="22" rx="9" fill="#EFE3CF" />
        <rect x="0" y="16" width="260" height="8" fill="#CBBBA2" />
        <rect x="14" y="24" width="12" height="72" rx="4" fill={P.carbo.light} />
        <rect x="234" y="24" width="12" height="72" rx="4" fill={P.carbo.light} />
        <ellipse cx="90" cy="8" rx="30" ry="5" fill="#fff" opacity="0.8" />
        <ellipse cx="170" cy="9" rx="18" ry="4" fill="#fff" opacity="0.7" />
      </Piece>
    </div>
  )
}

/** The back flour room: sacks, shelves of tins and a window. */
export function FlourBackdrop() {
  return (
    <div className="absolute inset-0">
      <RoomShell wall="#EBDDC8" wall2="#DCC9AC" floor="#A28A70" floor2="#957E66" trim="#B79E83" tiles={9} />
      <Piece x={0.3} y={0.42} h={0.3} ratio={1.3}>
        <rect width="130" height="100" rx="6" fill={P.xocolata.shade} />
        <rect x="6" y="6" width="118" height="42" fill="#D9C2A5" />
        <rect x="6" y="52" width="118" height="42" fill="#D9C2A5" />
        {[14, 46, 78].map((x) => (
          <rect key={x} x={x} y="14" width="26" height="30" rx="5" fill={P.mango.light} />
        ))}
        {[20, 62].map((x) => (
          <rect key={x} x={x} y="60" width="34" height="30" rx="5" fill={P.neu.base} />
        ))}
      </Piece>
      {[0.62, 0.74, 0.86].map((x, i) => (
        <Piece key={x} x={x} y={0.5 + (i % 2) * 0.06} h={0.22} ratio={0.8}>
          <ellipse cx="40" cy="97" rx="36" ry="4" fill={INK.shadow} opacity="0.16" />
          <path d="M6 96 Q0 60 10 22 Q40 8 70 22 Q80 60 74 96Z" fill={P.neu.base} />
          <path d="M44 30 Q70 40 72 96 L74 96 Q80 60 70 22Z" fill={P.neu.shade} />
          <rect x="18" y="44" width="44" height="26" rx="6" fill={P.coral.base} />
          <text x="40" y="63" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff" fontFamily="var(--font-display)">
            FARINA
          </text>
        </Piece>
      ))}
    </div>
  )
}
