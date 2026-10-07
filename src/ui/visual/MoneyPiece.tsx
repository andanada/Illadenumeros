import { PALETTE } from './shared'
import { isNote, pieceLabel } from './moneyLogic'

/** Original flat designs (not real euro artwork): coloured discs and plain notes with a big value. */
const COIN_STYLE: Record<number, { fill: string; ring: string; text: string }> = {
  1: { fill: '#f5a97f', ring: '#d9825a', text: PALETTE.ink },
  2: { fill: '#f5a97f', ring: '#d9825a', text: PALETTE.ink },
  5: { fill: '#f5a97f', ring: '#d9825a', text: PALETTE.ink },
  10: { fill: '#ffd23f', ring: '#e0a800', text: PALETTE.ink },
  20: { fill: '#ffd23f', ring: '#e0a800', text: PALETTE.ink },
  50: { fill: '#ffd23f', ring: '#e0a800', text: PALETTE.ink },
  100: { fill: '#e5e7eb', ring: '#ffd23f', text: PALETTE.ink },
  200: { fill: '#ffd23f', ring: '#e5e7eb', text: PALETTE.ink },
}

const NOTE_FILL: Record<number, string> = { 500: '#86efac', 1000: '#fda4af', 2000: '#93c5fd' }

/** Diameter in px of a coin; bigger values are slightly bigger, like real coins. */
export function coinDiameter(cents: number, base: number): number {
  const scale = cents >= 200 ? 1.1 : cents >= 100 ? 1.04 : cents >= 50 ? 1 : cents >= 20 ? 0.94 : cents >= 10 ? 0.86 : 0.8
  return Math.round(base * scale)
}

export interface MoneyPieceProps {
  cents: number
  /** Base size in px (coin diameter / note height). */
  size?: number
}

/** A single coin or note, decorative (the parent provides the accessible name). */
export function MoneyPiece({ cents, size = 56 }: MoneyPieceProps) {
  const label = pieceLabel(cents)
  if (isNote(cents)) {
    const w = size * 1.7
    const h = size
    return (
      <svg width={w} height={h} viewBox="0 0 100 60" aria-hidden="true" className="drop-shadow-sm">
        <rect x="2" y="2" width="96" height="56" rx="8" fill={NOTE_FILL[cents] ?? '#c4b5fd'} stroke="#fff" strokeWidth="4" />
        <rect x="9" y="9" width="82" height="42" rx="5" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="2" strokeDasharray="3 4" />
        <circle cx="22" cy="30" r="9" fill="#fff" fillOpacity="0.55" />
        <text x="62" y="39" textAnchor="middle" fontSize="26" fontWeight="700" fill={PALETTE.ink}>
          {label}
        </text>
      </svg>
    )
  }
  const d = coinDiameter(cents, size)
  const style = COIN_STYLE[cents] ?? { fill: '#e5e7eb', ring: '#cbd5e1', text: PALETTE.ink }
  const small = cents < 100
  return (
    <svg width={d} height={d} viewBox="0 0 60 60" aria-hidden="true" className="drop-shadow-sm">
      <circle cx="30" cy="30" r="28" fill={style.ring} stroke="#fff" strokeWidth="3" />
      <circle cx="30" cy="30" r="21" fill={style.fill} />
      <ellipse cx="21" cy="19" rx="7" ry="4" fill="#fff" opacity="0.6" transform="rotate(-30 21 19)" />
      <text x="30" y={small ? 36 : 38} textAnchor="middle" fontSize={small ? 17 : 22} fontWeight="700" fill={style.text}>
        {small ? cents : cents / 100}
      </text>
    </svg>
  )
}
