import { INK, PALETTE as P } from '../../../art/palette'
import { Piece, PropPiece } from '../../../sandbox/art/roomArt'

export const FLOOR_TOP = 0.44
const TOP = `${FLOOR_TOP * 100}%`

/** Sky, far hills and the grass of the farm; the colours of each room are set by the caller. */
function Land({ sky, hill, grass, grass2 }: { sky: [string, string]; hill: string; grass: string; grass2: string }) {
  return (
    <>
      <div className="absolute inset-x-0 top-0" style={{ height: TOP, background: `linear-gradient(${sky[0]}, ${sky[1]})` }} />
      <svg aria-hidden="true" viewBox="0 0 400 100" preserveAspectRatio="none" className="absolute inset-x-0" style={{ top: '24%', height: '21%' }}>
        <path d="M0 100 L0 52 Q60 8 130 44 Q200 76 270 30 Q340 -8 400 40 L400 100 Z" fill={hill} />
      </svg>
      <div className="absolute inset-x-0 bottom-0" style={{ top: TOP, background: `repeating-linear-gradient(0deg, ${grass} 0 12%, ${grass2} 12% 24%)` }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: TOP, background: 'linear-gradient(rgba(43,36,64,0.12), rgba(43,36,64,0) 20%)' }} />
    </>
  )
}

function Fence({ x, w, y }: { x: number; w: number; y: number }) {
  return (
    <Piece x={x} y={y} h={0.09} ratio={w * 8}>
      {Array.from({ length: Math.round(w * 40) }, (_, i) => (
        <rect key={i} x={i * 20 + 4} y="14" width="9" height="82" rx="3" fill={P.neu.base} />
      ))}
      <rect x="0" y="34" width={w * 800} height="9" rx="3" fill={P.neu.shade} />
      <rect x="0" y="64" width={w * 800} height="9" rx="3" fill={P.neu.shade} />
    </Piece>
  )
}

function Barn({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <Piece x={x} y={y} h={h} ratio={1.2}>
      <ellipse cx="60" cy="98" rx="62" ry="4" fill={INK.shadow} opacity="0.16" />
      <rect x="6" y="38" width="108" height="60" rx="4" fill={P.coral.base} />
      <path d="M0 42 L60 2 L120 42 Z" fill={P.coral.shade} />
      <path d="M86 40 L114 40 L114 98 L86 98 Z" fill={P.coral.shade} opacity="0.4" />
      <rect x="36" y="56" width="48" height="42" rx="3" fill={P.neu.base} />
      <path d="M36 56 L84 98 M84 56 L36 98" stroke={P.coral.base} strokeWidth="5" />
      <circle cx="60" cy="30" r="7" fill={P.neu.base} />
    </Piece>
  )
}

function Scarecrow({ x, y }: { x: number; y: number }) {
  return (
    <Piece x={x} y={y} h={0.2} ratio={0.8}>
      <rect x="38" y="30" width="5" height="68" fill={P.xocolata.base} />
      <rect x="10" y="40" width="62" height="6" rx="3" fill={P.xocolata.base} />
      <path d="M26 38 L58 38 L62 72 L22 72 Z" fill={P.cel.base} />
      <circle cx="41" cy="24" r="12" fill={P.mango.light} />
      <path d="M22 18 L60 18 L52 2 L30 2 Z" fill={P.mango.shade} />
      <circle cx="37" cy="24" r="1.8" fill={INK.face} />
      <circle cx="46" cy="24" r="1.8" fill={INK.face} />
    </Piece>
  )
}

/** The kitchen garden: soil with furrows on the right (where the plots lie), the barn far away, a scarecrow. */
export function HortBackdrop() {
  return (
    <div className="absolute inset-0">
      <Land sky={['#BFE6FF', '#E8F6FF']} hill={P.llima.light} grass={P.llima.base} grass2="#9BC53A" />
      <Barn x={0.12} y={0.46} h={0.26} />
      <PropPiece id="arbre" x={0.9} y={0.47} h={0.3} />
      <div className="absolute" style={{ left: '27%', right: '1%', top: '45.5%', bottom: '2%', borderRadius: 22, background: P.xocolata.light }} />
      <div className="absolute" style={{ left: '28%', right: '2%', top: '47%', bottom: '3.5%', borderRadius: 18, background: `repeating-linear-gradient(0deg, ${P.xocolata.base} 0 3.5%, #7A4A30 3.5% 7%)` }} />
      <Scarecrow x={0.2} y={0.62} />
      <Fence x={0.14} w={0.24} y={0.97} />
    </div>
  )
}

function Pond() {
  return (
    <Piece x={0.74} y={0.9} h={0.2} ratio={2.4}>
      <ellipse cx="120" cy="64" rx="116" ry="34" fill={P.cel.shade} />
      <ellipse cx="120" cy="58" rx="110" ry="30" fill={P.cel.base} />
      <path d="M44 56 Q70 46 96 54" stroke={P.cel.light} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M140 66 Q166 56 190 62" stroke={P.cel.light} strokeWidth="5" strokeLinecap="round" fill="none" />
      <ellipse cx="170" cy="48" rx="14" ry="6" fill={P.llima.base} />
      <ellipse cx="72" cy="68" rx="12" ry="5" fill={P.llima.base} />
    </Piece>
  )
}

function HenHouse({ x, y }: { x: number; y: number }) {
  return (
    <Piece x={x} y={y} h={0.26} ratio={1.1}>
      <ellipse cx="55" cy="98" rx="56" ry="4" fill={INK.shadow} opacity="0.16" />
      <rect x="14" y="50" width="82" height="48" rx="4" fill={P.mango.base} />
      <path d="M6 54 L55 14 L104 54 Z" fill={P.mango.shade} />
      <path d="M40 98 L40 74 Q55 60 70 74 L70 98 Z" fill={P.xocolata.shade} />
      <rect x="18" y="62" width="14" height="14" rx="3" fill={P.neu.base} />
      <rect x="40" y="94" width="30" height="4" fill={P.xocolata.base} />
    </Piece>
  )
}

function Tractor({ x, y }: { x: number; y: number }) {
  return (
    <Piece x={x} y={y} h={0.3} ratio={1.5}>
      <ellipse cx="75" cy="98" rx="70" ry="4" fill={INK.shadow} opacity="0.16" />
      <rect x="14" y="48" width="86" height="26" rx="8" fill={P.llima.base} />
      <rect x="84" y="26" width="48" height="32" rx="6" fill={P.llima.shade} />
      <rect x="92" y="32" width="32" height="18" rx="4" fill={P.cel.light} />
      <rect x="116" y="56" width="26" height="16" rx="5" fill={P.llima.base} />
      <circle cx="40" cy="76" r="22" fill={P.carbo.base} />
      <circle cx="40" cy="76" r="9" fill={P.mango.base} />
      <circle cx="112" cy="86" r="12" fill={P.carbo.base} />
      <circle cx="112" cy="86" r="5" fill={P.mango.base} />
      <rect x="28" y="30" width="5" height="22" fill={P.carbo.light} />
    </Piece>
  )
}

/** The farmyard: red barn, hen house with nests, pond with lily pads, the tractor and a fence. */
export function CorralBackdrop() {
  return (
    <div className="absolute inset-0">
      <Land sky={['#FFE3B8', '#FFF4DE']} hill={P.llima.light} grass={P.llima.light} grass2={P.llima.base} />
      <Barn x={0.5} y={0.5} h={0.36} />
      <HenHouse x={0.2} y={0.52} />
      <Pond />
      <Tractor x={0.3} y={0.9} />
      <Fence x={0.62} w={0.3} y={0.5} />
    </div>
  )
}
