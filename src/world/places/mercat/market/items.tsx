import { PALETTE as P } from '../../../art/palette'
import { PROPS_BY_ID } from '../../../art/props'
import { Contact } from '../../../sandbox/art/foodArt'
import type { InteractableDef } from '../../../sandbox/defs'
import { centsOfPiece, MoneyArt, PIECES, pieceId, pieceLabel, pieceSingle } from './MoneyArt'

/** A library prop (apple, orange…) drawn in the 100-wide art box of a sandbox object. */
function Prop({ id }: { id: string }) {
  const def = PROPS_BY_ID[id]
  if (!def) return null
  const k = 100 / Math.max(def.w, def.h)
  return (
    <g>
      <Contact rx={30} />
      <g transform={`translate(${50 - (def.w * k) / 2} ${100 - def.h * k}) scale(${k})`}>{def.render({})}</g>
    </g>
  )
}

function CheeseArt() {
  return (
    <g>
      <Contact rx={34} />
      <path d="M12 70 L50 26 L90 70 Z" fill={P.mango.light} />
      <path d="M12 70 L90 70 L90 88 Q50 96 12 88 Z" fill={P.mango.base} />
      <circle cx="40" cy="80" r="5" fill={P.mango.shade} />
      <circle cx="66" cy="78" r="4" fill={P.mango.shade} />
      <circle cx="56" cy="58" r="5" fill={P.mango.shade} opacity="0.7" />
    </g>
  )
}

function FlowerArt() {
  return (
    <g>
      <Contact rx={20} />
      <path d="M50 94 V50" stroke={P.llima.shade} strokeWidth="6" strokeLinecap="round" />
      <path d="M50 78 q-18 -4 -18 -18 q16 2 18 18Z" fill={P.llima.base} />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="50" cy="26" rx="10" ry="16" fill={P.rosa.base} transform={`rotate(${a} 50 40)`} />
      ))}
      <circle cx="50" cy="40" r="9" fill={P.mango.base} />
    </g>
  )
}

function ShirtArt() {
  return (
    <g>
      <Contact rx={32} />
      <path d="M26 30 L40 22 Q50 34 60 22 L74 30 L90 48 L78 58 L70 50 L70 90 L30 90 L30 50 L22 58 L10 48 Z" fill={P.cel.base} />
      <path d="M70 50 L70 90 L56 90 L56 40 Z" fill={P.cel.shade} opacity="0.4" />
      <rect x="36" y="62" width="28" height="8" rx="4" fill={P.neu.base} opacity="0.85" />
    </g>
  )
}

/** A paper bag with a tenth of a kilo (100 g) of apples. */
export function BagArt() {
  return (
    <g>
      <Contact rx={28} />
      <path d="M24 36 L34 24 L66 24 L76 36 L72 92 L28 92 Z" fill="#E9B07C" />
      <path d="M24 36 L34 24 L66 24 L76 36 Z" fill="#C98D5E" />
      <path d="M62 36 L72 92 L56 92 Z" fill="#C98D5E" opacity="0.5" />
      <rect x="34" y="52" width="32" height="22" rx="5" fill={P.neu.base} />
      <text x="50" y="68" fontSize="15" textAnchor="middle" fill={P.carbo.base} style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
        100 g
      </text>
    </g>
  )
}

/** Grams of each thing the scale weighs (free play), so the readout can say «0,35 kg». */
export const GRAMS: Readonly<Record<string, number>> = { poma: 150, taronja: 200, formatge: 250, bossa: 100, flor: 30 }

const pieceDefs: readonly InteractableDef[] = PIECES.map((cents) => ({
  id: pieceId(cents),
  label: pieceLabel(cents),
  single: pieceSingle(cents),
  height: cents >= 500 ? 0.06 : 0.07,
  pickup: true,
  art: () => <MoneyArt cents={cents} />,
}))

export const MARKET_DEFS: readonly InteractableDef[] = [
  { id: 'poma', label: 'la poma', single: 'una poma', height: 0.075, pickup: true, toss: true, art: () => <Prop id="poma" /> },
  { id: 'taronja', label: 'la taronja', single: 'una taronja', height: 0.075, pickup: true, toss: true, art: () => <Prop id="taronja" /> },
  { id: 'formatge', label: 'el formatge', single: 'un formatge', height: 0.09, pickup: true, art: () => <CheeseArt /> },
  { id: 'flor', label: 'la flor', single: 'una flor', height: 0.1, pickup: true, art: () => <FlowerArt /> },
  { id: 'camisa', label: 'la camisa', single: 'una camisa', height: 0.11, pickup: true, art: () => <ShirtArt /> },
  { id: 'bossa', label: 'la bossa de 100 grams', single: 'una bossa de 100 grams', height: 0.085, pickup: true, art: () => <BagArt /> },
  ...pieceDefs,
]

/** Value of a piece in cents, or 0 for anything else. */
export const valueOf = (defId: string): number => centsOfPiece(defId) ?? 0
