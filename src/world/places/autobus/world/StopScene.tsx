import { PALETTE as P } from '../../../art/palette'
import { Piece, PropPiece } from '../../../sandbox/art/roomArt'
import { useBusLook } from '../interior/busLook'
import { StreetBackdrop } from '../interior/StreetBackdrop'
import { STOP_BENCH } from './busLayout'

/** The kiosk: a striped awning, a counter and shelves of treats. Feet at the bottom. */
function Kiosk() {
  return (
    <Piece x={0.64} y={0.6} h={0.36} ratio={1.15}>
      <rect x="6" y="30" width="108" height="70" rx="8" fill={P.cel.base} />
      <rect x="14" y="40" width="92" height="30" rx="5" fill={P.cel.light} />
      <rect x="20" y="48" width="14" height="22" rx="3" fill={P.coral.base} />
      <rect x="40" y="52" width="14" height="18" rx="3" fill={P.mango.base} />
      <rect x="60" y="46" width="14" height="24" rx="3" fill={P.menta.base} />
      <rect x="80" y="50" width="14" height="20" rx="3" fill={P.rosa.base} />
      <rect x="0" y="78" width="120" height="22" rx="6" fill={P.xocolata.base} />
      <rect x="0" y="78" width="120" height="7" rx="3.5" fill={P.xocolata.light} />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d={`M${i * 20} 8 h20 l4 24 h-28 z`} fill={i % 2 ? '#fff' : P.coral.base} />
      ))}
      <rect x="0" y="4" width="120" height="8" rx="4" fill={P.coral.shade} />
    </Piece>
  )
}

/** The bus seen from the stop: its side with the open door (the DoorDef sits in it). */
function BusSide({ night }: { night: boolean }) {
  return (
    <Piece x={1.02} y={0.74} h={0.5} ratio={1.1}>
      <path d="M0 0 H110 V100 H0 Z" fill={P.mango.base} />
      <rect x="0" y="62" width="110" height="38" fill={P.mango.shade} />
      <rect x="0" y="52" width="110" height="6" fill={P.coral.base} />
      <rect x="6" y="10" width="26" height="36" rx="6" fill={night ? '#6E6AA8' : P.cel.light} />
      <rect x="38" y="10" width="26" height="36" rx="6" fill={night ? '#6E6AA8' : P.cel.light} />
      <circle cx="26" cy="96" r="14" fill={P.carbo.base} />
      <circle cx="26" cy="96" r="6" fill={P.neu.shade} />
    </Piece>
  )
}

/** The bus stop outside: sky and houses of the street, pavement, a sign, a bench and the kiosk. */
export function StopScene() {
  const night = useBusLook().night
  return (
    <div className="absolute inset-0" data-testid="stop-scene">
      <div className="absolute inset-x-0 overflow-hidden" style={{ top: 0, height: '60%' }}>
        <StreetBackdrop />
      </div>
      <div className="absolute inset-x-0" style={{ top: '54%', height: '4%', background: P.carbo.light }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: '57%', background: `repeating-linear-gradient(90deg, ${night ? '#7a6a96' : '#e4d9c6'} 0 11%, ${night ? '#6f5f8c' : '#d8cbb4'} 11% 22%)` }} />
      <div className="absolute inset-x-0" style={{ top: '57%', height: '8%', background: 'linear-gradient(rgba(43,36,64,0.2), rgba(43,36,64,0))' }} />
      <PropPiece id="parada-autobus" x={0.43} y={0.66} h={0.46} />
      <PropPiece id="arbre" x={0.06} y={0.64} h={0.42} />
      <PropPiece id="fanal" x={0.5} y={0.64} h={0.5} />
      {STOP_BENCH.length > 0 && <PropPiece id="banc" x={0.255} y={0.71} h={0.17} />}
      <Kiosk />
      <BusSide night={night} />
    </div>
  )
}
