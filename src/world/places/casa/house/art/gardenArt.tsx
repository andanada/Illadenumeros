import { INK, PALETTE as P } from '../../../../art/palette'

const Contact = ({ rx = 30 }: { rx?: number }) => <ellipse cx="50" cy="97" rx={rx} ry="5" fill={INK.shadow} opacity="0.16" />

/** A plant pot that grows: llavor, brot, planta, florida. */
export function GrowArt({ stage }: { stage: string }) {
  const level = ['llavor', 'brot', 'planta', 'florida'].indexOf(stage)
  return (
    <g>
      <Contact rx={32} />
      <path d="M22 62 L78 62 L70 96 Q50 100 30 96 Z" fill={P.coral.base} />
      <path d="M78 62 L70 96 Q62 98 56 98 Q70 84 70 62 Z" fill={P.coral.shade} />
      <rect x="18" y="56" width="64" height="12" rx="6" fill={P.coral.light} />
      <ellipse cx="50" cy="58" rx="28" ry="5" fill={P.xocolata.base} />
      {level === 0 && <ellipse cx="50" cy="55" rx="6" ry="3.4" fill={P.mango.light} />}
      {level >= 1 && (
        <g>
          <rect x="48" y={level === 1 ? 40 : level === 2 ? 22 : 12} width="4" height={level === 1 ? 18 : level === 2 ? 36 : 46} rx="2" fill={P.llima.shade} />
          <path d={`M50 ${level === 1 ? 46 : 38} Q30 ${level === 1 ? 34 : 24} 28 ${level === 1 ? 44 : 32} Q44 ${level === 1 ? 50 : 42} 50 ${level === 1 ? 46 : 38} Z`} fill={P.llima.base} />
          <path d={`M50 ${level === 1 ? 46 : 38} Q70 ${level === 1 ? 34 : 24} 72 ${level === 1 ? 44 : 32} Q56 ${level === 1 ? 50 : 42} 50 ${level === 1 ? 46 : 38} Z`} fill={P.menta.base} />
        </g>
      )}
      {level >= 2 && <path d="M50 46 Q26 40 20 52 Q38 60 50 46 Z" fill={P.llima.light} />}
      {level === 3 && (
        <g>
          {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="50" cy="-2" rx="7" ry="11" fill={P.rosa.base} transform={`rotate(${a} 50 12)`} />)}
          <circle cx="50" cy="12" r="7" fill={P.mango.base} />
        </g>
      )}
    </g>
  )
}

export function CanArt() {
  return (
    <g>
      <Contact rx={32} />
      <path d="M28 44 L72 44 L68 90 Q50 96 32 90 Z" fill={P.cel.base} />
      <path d="M72 44 L68 90 Q60 93 55 94 Q68 74 66 44 Z" fill={P.cel.shade} />
      <path d="M72 58 L94 40 L98 46 L74 72 Z" fill={P.cel.base} />
      <ellipse cx="96" cy="43" rx="6" ry="9" fill={P.cel.shade} transform="rotate(40 96 43)" />
      <path d="M30 50 Q10 54 24 76" stroke={P.cel.shade} strokeWidth="6" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="44" rx="22" ry="5" fill={P.cel.light} />
    </g>
  )
}
