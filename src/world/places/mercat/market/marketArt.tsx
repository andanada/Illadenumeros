import { INK, PALETTE as P } from '../../../art/palette'
import { Piece } from '../../../sandbox/art/roomArt'
import type { PaletteColor } from '../../../model/types'

export const FLOOR_TOP = 0.46

export interface StallDef {
  readonly id: string
  readonly name: string
  readonly x: number
  readonly color: PaletteColor
  /** Sign on the awning, with a decimal price. */
  readonly sign: string
  readonly tag?: string
}

/** The four stalls, left to right: fruit, cheese, flowers, clothes. */
export const STALLS: readonly StallDef[] = [
  { id: 'fruita', name: 'la parada de fruita', x: 0.13, color: 'coral', sign: 'FRUITA 1,50 €/kg' },
  { id: 'formatge', name: 'la parada de formatge', x: 0.38, color: 'mango', sign: 'FORMATGE 4,20 €', tag: '−25 %' },
  { id: 'flors', name: 'la parada de flors', x: 0.63, color: 'rosa', sign: 'FLORS 0,75 €' },
  { id: 'roba', name: 'la parada de roba', x: 0.88, color: 'cel', sign: 'ROBA 12,50 €', tag: '−10 %' },
]

function Stall({ stall }: { stall: StallDef }) {
  const c = P[stall.color]
  return (
    <Piece x={stall.x} y={0.585} h={0.42} ratio={1.04}>
      <ellipse cx="52" cy="97" rx="50" ry="3.4" fill={INK.shadow} opacity="0.16" />
      <rect x="6" y="16" width="4" height="82" fill={P.xocolata.base} />
      <rect x="94" y="16" width="4" height="82" fill={P.xocolata.base} />
      <rect x="4" y="66" width="96" height="32" rx="5" fill={P.xocolata.light} />
      <rect x="4" y="66" width="96" height="8" rx="4" fill={P.xocolata.base} />
      <path d="M0 40 L9 20 L95 20 L104 40 Z" fill={c.base} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${i * 17.3} 40 L${9 + i * 14.4} 20 L${23.4 + i * 14.4} 20 L${17.3 + i * 17.3} 40 Z`} fill={i % 2 ? P.neu.base : c.base} />
      ))}
      <path d="M0 40 q8.7 10 17.3 0 q8.7 10 17.3 0 q8.7 10 17.3 0 q8.7 10 17.3 0 q8.7 10 17.3 0 q8.7 10 17.3 0" fill={c.shade} />
      <rect x="10" y="0" width="84" height="17" rx="6" fill={P.neu.base} />
      <rect x="10" y="12" width="84" height="5" rx="2.5" fill={P.neu.shade} />
      <text x="52" y="11.5" fontSize="7.6" textAnchor="middle" fill={P.carbo.base} style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
        {stall.sign}
      </text>
      {stall.tag && (
        <g transform="translate(80 84) rotate(-6)">
          <rect x="-15" y="-8" width="32" height="16" rx="5" fill={P.mango.base} />
          <circle cx="-10" cy="0" r="2.2" fill={P.neu.base} />
          <text x="4" y="3.6" fontSize="8.6" textAnchor="middle" fill={P.carbo.base} style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {stall.tag}
          </text>
        </g>
      )}
    </Piece>
  )
}

function Bunting() {
  const colors = [P.coral.base, P.mango.base, P.menta.base, P.cel.base, P.rosa.base]
  return (
    <svg aria-hidden="true" viewBox="0 0 400 40" preserveAspectRatio="none" className="absolute inset-x-0" style={{ top: '5%', height: '9%' }}>
      <path d="M0 6 Q100 34 200 8 T400 6" stroke={P.xocolata.base} strokeWidth="1.6" fill="none" />
      {Array.from({ length: 16 }, (_, i) => {
        const x = 12 + i * 24
        const y = 6 + Math.sin((x / 400) * Math.PI * 2.1) * 7 + 8
        return <path key={x} d={`M${x - 7} ${y - 4} L${x + 7} ${y - 4} L${x} ${y + 12} Z`} fill={colors[i % colors.length]} />
      })}
    </svg>
  )
}

/** The market square: bunting, four stalls with decimal prices and discount tags, a cobbled floor. */
export function MarketBackdrop() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-x-0 top-0" style={{ height: `${FLOOR_TOP * 100}%`, background: 'linear-gradient(#C9E8FF, #FFF1D6)' }} />
      <svg aria-hidden="true" viewBox="0 0 400 100" preserveAspectRatio="none" className="absolute inset-x-0" style={{ top: '18%', height: '28%' }}>
        <path d="M0 100 L0 40 L30 40 L30 22 L70 22 L70 46 L110 46 L110 30 L150 30 L150 50 L200 50 L200 18 L246 18 L246 44 L300 44 L300 28 L340 28 L340 48 L400 48 L400 100Z" fill={P.lila.light} opacity="0.55" />
      </svg>
      <Bunting />
      <div className="absolute inset-x-0 bottom-0" style={{ top: `${FLOOR_TOP * 100}%`, background: `repeating-linear-gradient(90deg, #EBD9B8 0 7%, #E3CFA8 7% 14%)` }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: `${FLOOR_TOP * 100}%`, background: 'linear-gradient(rgba(43,36,64,0.14), rgba(43,36,64,0) 22%)' }} />
      {STALLS.map((s) => (
        <Stall key={s.id} stall={s} />
      ))}
    </div>
  )
}
