import { INK, PALETTE as P } from '../../../art/palette'
import { PropArt } from '../../../art/props'
import { Piece, PropPiece } from '../../../sandbox/art/roomArt'

const FLOOR_TOP = '46%'

/** Wall + floor bands shared by every room of the shop; the colours tell the rooms apart. */
function Shell({ wall, wall2, floor, floor2, trim }: { wall: string; wall2: string; floor: string; floor2: string; trim: string }) {
  return (
    <>
      <div className="absolute inset-x-0 top-0" style={{ height: FLOOR_TOP, background: `linear-gradient(${wall}, ${wall2})` }} />
      <div className="absolute inset-x-0" style={{ top: '43.5%', height: '3%', background: trim }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: FLOOR_TOP, background: `repeating-linear-gradient(90deg, ${floor} 0 8%, ${floor2} 8% 16%)` }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: FLOOR_TOP, background: 'linear-gradient(rgba(43,36,64,0.16), rgba(43,36,64,0) 24%)' }} />
    </>
  )
}

export function ShopFloorBackdrop() {
  return (
    <div className="absolute inset-0">
      <Shell wall="#FFE9C4" wall2="#FFD9A0" floor={P.xocolata.light} floor2="#C98F63" trim={P.mango.base} />
      <div className="absolute" style={{ left: '11%', top: '10%', width: '46%', height: '35%', background: '#F4D3A6', borderRadius: 14, boxShadow: `inset 0 0 0 6px ${P.xocolata.shade}` }} />
      {[21, 32, 43].map((y) => (
        <div key={y} className="absolute" style={{ left: '11%', width: '46%', top: `${y}%`, height: '1.8%', background: P.xocolata.light, boxShadow: `0 3px 0 ${P.xocolata.shade}` }} />
      ))}
      <div className="absolute left-[18%] top-[2%] rounded-b-2xl px-4 py-1 text-xs font-bold tracking-widest text-white sm:text-sm" style={{ background: P.xocolata.base }}>
        FRUITA · PA
      </div>
      <Piece x={0.7} y={0.32} h={0.24} ratio={1}>
        <rect x="0" y="0" width="100" height="100" rx="12" fill={P.neu.base} />
        <rect x="8" y="8" width="84" height="84" rx="8" fill={P.cel.light} />
        <circle cx="68" cy="30" r="10" fill={P.mango.base} />
        <path d="M8 70 Q34 52 56 66 T92 60 V92 H8Z" fill={P.llima.base} />
        <rect x="47" y="8" width="5" height="84" fill={P.neu.base} />
      </Piece>
      <Counter />
      <PropPiece id="caixa-registradora" x={0.63} y={0.545} h={0.13} />
    </div>
  )
}

function Counter() {
  return (
    <Piece x={0.72} y={0.66} h={0.2} ratio={2.4}>
      <ellipse cx="120" cy="97" rx="116" ry="5" fill={INK.shadow} opacity="0.16" />
      <rect x="0" y="0" width="240" height="26" rx="10" fill="#F4D3A6" />
      <rect x="0" y="18" width="240" height="8" fill="#D9A06C" />
      <rect x="4" y="26" width="232" height="70" fill={P.coral.base} />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={4 + i * 40} y="26" width="20" height="70" fill={P.neu.base} opacity="0.9" />
      ))}
    </Piece>
  )
}

function Crates({ items }: { items: ReadonlyArray<readonly [number, number]> }) {
  return (
    <>
      {items.map(([x, y]) => (
        <Piece key={`${x}${y}`} x={x} y={y} h={0.14} ratio={1}>
          <rect x="4" y="30" width="92" height="64" rx="8" fill={P.xocolata.light} />
          <rect x="10" y="40" width="80" height="8" rx="3" fill={P.xocolata.base} />
          <rect x="10" y="58" width="80" height="8" rx="3" fill={P.xocolata.base} />
        </Piece>
      ))}
    </>
  )
}

export function BackRoomBackdrop() {
  return (
    <div className="absolute inset-0">
      <Shell wall="#E7D9C8" wall2="#D6C4AE" floor="#9A8068" floor2="#8D7360" trim="#B79E83" />
      <Piece x={0.34} y={0.43} h={0.34} ratio={1.5}>
        <rect x="0" y="0" width="150" height="100" rx="6" fill={P.xocolata.shade} />
        <rect x="6" y="6" width="138" height="42" fill="#D9C2A5" />
        <rect x="6" y="52" width="138" height="42" fill="#D9C2A5" />
      </Piece>
      <Crates items={[[0.28, 0.35], [0.4, 0.35], [0.31, 0.2], [0.43, 0.2]]} />
      <Piece x={0.52} y={0.46} h={0.3} ratio={0.8}>
        <path d="M0 100 L80 100 L80 0 L60 0 L60 20 L40 20 L40 40 L20 40 L20 60 L0 60Z" fill={P.neu.shade} />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 20} y={60 - i * 20 + 4} width="20" height="6" fill={P.neu.base} />
        ))}
      </Piece>
      <Crates items={[[0.74, 0.46]]} />
    </div>
  )
}

export function ColdRoomBackdrop() {
  return (
    <div className="absolute inset-0">
      <Shell wall="#D7F0FF" wall2="#BFE3F7" floor="#E8F4FB" floor2="#D4E8F2" trim="#9CCFF7" />
      {[0.24, 0.5, 0.76].map((x) => (
        <Piece key={x} x={x} y={0.44} h={0.34} ratio={0.7}>
          <rect x="0" y="0" width="70" height="100" rx="10" fill={P.cel.shade} />
          <rect x="5" y="5" width="60" height="90" rx="7" fill="#fff" />
          {[30, 60].map((y) => (
            <rect key={y} x="5" y={y} width="60" height="5" fill={P.cel.light} />
          ))}
          <rect x="12" y="14" width="14" height="16" rx="3" fill={P.neu.shade} />
          <rect x="34" y="14" width="22" height="16" rx="3" fill={P.mango.light} />
          <rect x="14" y="68" width="40" height="20" rx="3" fill={P.cel.light} />
        </Piece>
      ))}
      {[0.12, 0.88].map((x) => (
        <Piece key={x} x={x} y={0.2} h={0.08} ratio={1}>
          <path d="M50 10 V90 M14 30 L86 70 M14 70 L86 30" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
        </Piece>
      ))}
    </div>
  )
}

export function BayBackdrop() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(var(--world-sky-top,#8fd3ff), var(--world-sky-bottom,#d7f0ff) 46%)' }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: FLOOR_TOP, background: `linear-gradient(${P.neu.shade}, #CFC3AE)` }} />
      <PropArt id="nuvol-cel" size={64} title="" className="absolute left-[40%] top-[8%]" />
      <Piece x={0.66} y={0.62} h={0.4} ratio={2}>
        <ellipse cx="100" cy="97" rx="96" ry="5" fill={INK.shadow} opacity="0.2" />
        <rect x="6" y="14" width="130" height="68" rx="12" fill={P.menta.base} />
        <path d="M136 30 H170 Q188 34 192 58 V82 H136Z" fill={P.menta.shade} />
        <rect x="146" y="36" width="30" height="22" rx="6" fill={P.cel.light} />
        <circle cx="46" cy="86" r="14" fill={P.carbo.base} />
        <circle cx="160" cy="86" r="14" fill={P.carbo.base} />
        <rect x="30" y="34" width="76" height="14" rx="7" fill="#fff" opacity="0.5" />
      </Piece>
      <Crates items={[[0.2, 0.62]]} />
    </div>
  )
}
