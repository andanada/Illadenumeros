import { INK, PALETTE as P } from '../../../../art/palette'

const Contact = ({ rx = 30 }: { rx?: number }) => <ellipse cx="50" cy="97" rx={rx} ry="5" fill={INK.shadow} opacity="0.16" />

/** Bath tub in a 100 × 55 box (aspect 1.8): empty, full of water, with foam. */
export function TubArt({ stage }: { stage: string }) {
  const water = stage === 'plena' || stage === 'escuma'
  return (
    <g>
      <ellipse cx="50" cy="52" rx="48" ry="4" fill={INK.shadow} opacity="0.16" />
      <rect x="10" y="44" width="10" height="9" rx="3" fill={P.neu.shade} />
      <rect x="80" y="44" width="10" height="9" rx="3" fill={P.neu.shade} />
      <path d="M2 8 L98 8 Q98 46 78 46 L22 46 Q2 46 2 8 Z" fill={P.neu.base} />
      <path d="M98 8 Q98 46 78 46 L60 46 Q92 40 90 8 Z" fill={P.neu.shade} />
      <rect x="0" y="4" width="100" height="9" rx="4.5" fill={P.neu.light} />
      {water && <path d="M8 16 L92 16 Q92 38 76 40 L24 40 Q8 38 8 16 Z" fill={P.cel.light} />}
      {water && <path d="M8 16 L92 16 L92 21 Q50 26 8 21 Z" fill={P.cel.base} opacity="0.55" />}
      {stage === 'escuma' &&
        [
          [20, 15, 9],
          [36, 11, 11],
          [54, 13, 10],
          [70, 10, 12],
          [84, 15, 8],
        ].map(([x, y, r]) => <circle key={`${x}`} cx={x} cy={y} r={r} fill="#fff" />)}
      <rect x="86" y="-14" width="6" height="20" rx="3" fill={P.carbo.light} />
      <path d="M78 -14 L92 -14 L92 -9 L82 -9 Z" fill={P.carbo.light} />
    </g>
  )
}

export function BucketArt() {
  return (
    <g>
      <Contact rx={26} />
      <path d="M24 48 L76 48 L68 92 Q50 98 32 92 Z" fill={P.cel.base} />
      <path d="M76 48 L68 92 Q60 95 54 96 Q66 76 66 48 Z" fill={P.cel.shade} />
      <ellipse cx="50" cy="48" rx="26" ry="7" fill={P.cel.light} />
      <path d="M26 48 Q50 6 74 48" stroke={P.carbo.light} strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  )
}

export function SoapArt() {
  return (
    <g>
      <Contact rx={28} />
      <rect x="18" y="52" width="64" height="40" rx="14" fill={P.rosa.base} />
      <rect x="18" y="52" width="64" height="16" rx="8" fill={P.rosa.light} />
      <circle cx="30" cy="38" r="9" fill="#fff" opacity="0.95" />
      <circle cx="46" cy="30" r="6" fill="#fff" opacity="0.9" />
      <circle cx="70" cy="40" r="7" fill="#fff" opacity="0.9" />
    </g>
  )
}

/** The rubber duck: squeaky, round, with an orange beak. */
export function DuckArt() {
  return (
    <g>
      <Contact rx={30} />
      <ellipse cx="50" cy="72" rx="34" ry="24" fill={P.mango.base} />
      <path d="M26 82 Q50 100 78 78 Q70 96 50 96 Q32 96 26 82 Z" fill={P.mango.shade} />
      <circle cx="62" cy="40" r="20" fill={P.mango.base} />
      <circle cx="56" cy="34" r="7" fill={P.mango.light} opacity="0.7" />
      <path d="M78 40 Q96 40 94 50 Q80 52 76 48 Z" fill={P.coral.base} />
      <circle cx="66" cy="36" r="3.4" fill={INK.face} />
      <path d="M22 66 Q36 56 44 68 Q34 78 22 66 Z" fill={P.mango.shade} />
    </g>
  )
}

/** A tooth on a stand: dirty, with paste, sparkling clean. */
export function ToothArt({ stage }: { stage: string }) {
  const clean = stage === 'neta'
  return (
    <g>
      <Contact rx={30} />
      <path d="M22 28 Q22 8 50 8 Q78 8 78 28 Q78 52 70 60 Q66 92 58 92 Q52 92 50 74 Q48 92 42 92 Q34 92 30 60 Q22 52 22 28 Z" fill={clean ? '#fff' : P.neu.shade} />
      <path d="M30 18 Q36 12 46 12" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.9" />
      {stage === 'bruta' && [[38, 34], [58, 28], [52, 48]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r="4.4" fill={P.xocolata.light} opacity="0.7" />)}
      {stage === 'pasta' && <path d="M30 30 Q50 22 70 30 Q50 44 30 30 Z" fill={P.menta.light} />}
      {clean &&
        [[84, 14, 1], [18, 46, 0.7], [80, 54, 0.8]].map(([x, y, s]) => <path key={`${x}`} transform={`translate(${x} ${y}) scale(${s})`} d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4Z" fill={P.mango.light} />)}
    </g>
  )
}

export function BrushArt() {
  return (
    <g transform="rotate(-24 50 60)">
      <Contact rx={22} />
      <rect x="42" y="8" width="16" height="70" rx="8" fill={P.cel.base} />
      <rect x="42" y="8" width="7" height="70" rx="3.5" fill={P.cel.light} />
      <rect x="34" y="2" width="32" height="20" rx="6" fill={P.neu.base} />
      {[38, 45, 52, 59].map((x) => <rect key={x} x={x} y="-8" width="4" height="12" rx="2" fill={P.coral.base} />)}
    </g>
  )
}

export function PasteArt() {
  return (
    <g>
      <Contact rx={28} />
      <rect x="14" y="56" width="72" height="30" rx="12" fill={P.menta.base} />
      <rect x="14" y="56" width="72" height="12" rx="6" fill={P.menta.light} />
      <rect x="78" y="62" width="14" height="18" rx="4" fill={P.neu.base} />
      <rect x="28" y="62" width="22" height="18" rx="6" fill={P.neu.base} opacity="0.85" />
    </g>
  )
}
