import { PALETTE as P } from '../../../art/palette'
import { Piece } from '../../../sandbox/art/roomArt'
import { useBusLook } from '../interior/busLook'
import { StreetBackdrop } from '../interior/StreetBackdrop'
import { BUS_POLE, SEAT_SPOTS } from './busLayout'

/** A frontal bus seat: rounded backrest, cushion and a little handrail. Feet (the cushion's edge) at the bottom. */
function SeatPiece({ x, y, night }: { x: number; y: number; night: boolean }) {
  return (
    <Piece x={x} y={y} h={0.17} ratio={0.9}>
      <rect x="6" y="2" width="78" height="62" rx="22" fill={night ? '#5a4f86' : P.lila.base} />
      <rect x="14" y="10" width="62" height="40" rx="16" fill={night ? '#6b5fa0' : P.lila.light} />
      <rect x="2" y="56" width="86" height="34" rx="14" fill={night ? '#4b4176' : P.lila.shade} />
      <rect x="2" y="56" width="86" height="12" rx="6" fill={night ? '#5a4f86' : P.lila.base} />
      <rect x="14" y="88" width="10" height="12" rx="3" fill={P.carbo.base} />
      <rect x="66" y="88" width="10" height="12" rx="3" fill={P.carbo.base} />
    </Piece>
  )
}

function Pole() {
  return (
    <Piece x={BUS_POLE.x} y={0.92} h={0.86} ratio={0.12}>
      <rect x="4" y="0" width="4" height="100" rx="2" fill={P.neu.shade} />
      <rect x="5" y="0" width="1.4" height="100" fill="#fff" opacity="0.6" />
    </Piece>
  )
}

function Wheel() {
  return (
    <Piece x={0.955} y={0.6} h={0.2} ratio={0.6}>
      <rect x="22" y="48" width="6" height="52" fill={P.carbo.light} />
      <ellipse cx="30" cy="40" rx="26" ry="34" fill="none" stroke={P.carbo.base} strokeWidth="7" />
      <circle cx="30" cy="40" r="6" fill={P.carbo.base} />
    </Piece>
  )
}

/** The inside of the double-decker, cut open like a dolls' house: windows onto the street, seats, pole, stop button, rack. */
export function BusInterior({ requested, sign }: { requested: boolean; sign: string }) {
  const look = useBusLook()
  const night = look.night
  return (
    <div className="absolute inset-0" data-testid="bus-interior" data-requested={requested}>
      <div className="absolute inset-x-0 top-0" style={{ height: '13%', background: night ? '#3b3263' : P.mango.shade }} />
      <div className="absolute inset-x-0 overflow-hidden" style={{ top: '9%', height: '36%' }}>
        <StreetBackdrop />
      </div>
      {[0.03, 0.31, 0.64, 0.97].map((x) => (
        <div key={x} className="absolute rounded-full" style={{ left: `${x * 100}%`, top: '9%', width: '2.2%', height: '36%', background: night ? '#4b4176' : P.mango.base, transform: 'translateX(-50%)' }} />
      ))}
      <div className="absolute inset-x-0" style={{ top: '43%', height: '14%', background: night ? '#4b4176' : P.mango.base }} />
      <div className="absolute inset-x-0" style={{ top: '49%', height: '2.2%', background: P.coral.base }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: '56%', background: night ? '#5b5273' : `repeating-linear-gradient(90deg, ${P.neu.shade} 0 7%, #b9b1a2 7% 14%)` }} />
      <div className="absolute inset-x-0" style={{ top: '56%', height: '9%', background: 'linear-gradient(rgba(43,36,64,0.22), rgba(43,36,64,0))' }} />
      <div className="absolute rounded-xl" style={{ left: '5%', width: '41%', top: '41.5%', height: '2.4%', background: P.neu.shade }} />
      <div className="absolute rounded-2xl px-3 py-0.5 text-center font-display font-bold" style={{ left: '50%', top: '13%', transform: 'translateX(-50%)', background: P.carbo.base, color: P.mango.light, fontSize: 'clamp(12px, 2.2vmin, 22px)' }}>
        {sign}
      </div>
      {SEAT_SPOTS.map((s) => (
        <SeatPiece key={s.id} x={s.at.x} y={s.at.y} night={night} />
      ))}
      <Pole />
      <Wheel />
      <div className="absolute" style={{ left: '91%', width: '8%', top: '12%', height: '32%', borderRadius: '14% 30% 6% 6%', background: night ? '#6E6AA8' : P.cel.light, opacity: 0.85 }} />
      {look.night && <div className="absolute inset-0" style={{ background: 'rgba(30,24,70,0.18)' }} />}
    </div>
  )
}
