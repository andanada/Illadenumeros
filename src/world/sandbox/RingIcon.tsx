import { PALETTE as P } from '../art/palette'

export type RingGlyph = 'deixa' | 'llanca' | 'aixeca' | 'enrere'

const STROKE = { stroke: P.carbo.base, strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const

/** Small flat glyphs for the ring buttons that are not emotes. */
export function RingIcon({ glyph, size = 40 }: { glyph: RingGlyph; size?: number }) {
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} aria-hidden="true">
      {glyph === 'deixa' && (
        <g>
          <rect x="12" y="38" width="32" height="8" rx="4" fill={P.mango.base} />
          <path d="M28 8 V30 M18 22 L28 32 L38 22" {...STROKE} />
        </g>
      )}
      {glyph === 'llanca' && (
        <g>
          <path d="M8 44 Q22 4 46 30" {...STROKE} strokeDasharray="2 9" />
          <circle cx="46" cy="32" r="8" fill={P.coral.base} />
          <circle cx="44" cy="30" r="2.6" fill="#fff" opacity="0.7" />
        </g>
      )}
      {glyph === 'aixeca' && (
        <g>
          <circle cx="28" cy="14" r="7" fill={P.cel.base} />
          <path d="M28 24 V40 M20 48 L28 40 L36 48 M18 30 L28 24 L38 30" {...STROKE} />
        </g>
      )}
      {glyph === 'enrere' && <path d="M34 12 L18 28 L34 44" {...STROKE} />}
    </svg>
  )
}
