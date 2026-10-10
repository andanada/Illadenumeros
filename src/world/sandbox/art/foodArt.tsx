import { INK, PALETTE as P } from '../../art/palette'

/** Soft contact shadow under a small object (art box 100 wide, feet at y = 100). */
export const Contact = ({ rx = 30 }: { rx?: number }) => <ellipse cx="50" cy="97" rx={rx} ry="5" fill={INK.shadow} opacity="0.16" />

const Sparkle = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4Z" fill="#fff" />
)

const BODY = 'M50 34 C22 24 8 52 20 76 C28 93 42 95 50 90 C58 95 72 93 80 76 C92 52 78 24 50 34Z'

function Wedge({ x, y, rot, fill, skin }: { x: number; y: number; rot: number; fill: string; skin: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M-15 -4 Q0 -22 15 -4 Q0 -10 -15 -4Z" fill={skin} />
      <path d="M-15 -4 Q0 -10 15 -4 Q9 12 0 14 Q-9 12 -15 -4Z" fill={fill} />
      <circle cx="0" cy="2" r="1.6" fill={P.xocolata.base} opacity="0.7" />
    </g>
  )
}

function Steam() {
  return (
    <g stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.85">
      <path d="M36 44 Q30 34 38 26 Q44 18 36 10" />
      <path d="M52 40 Q46 30 54 22 Q60 14 52 6" />
      <path d="M68 44 Q62 34 70 26" />
    </g>
  )
}

/** The apple at each stage of its trip: crua, neta, tallada, cuita, emplatada. */
export function AppleArt({ stage }: { stage: string }) {
  if (stage === 'tallada' || stage === 'cuita' || stage === 'emplatada') {
    const cooked = stage !== 'tallada'
    const flesh = cooked ? P.mango.light : P.neu.base
    const skin = cooked ? P.mango.base : P.coral.base
    return (
      <g>
        <Contact rx={36} />
        {stage === 'emplatada' && (
          <g>
            <ellipse cx="50" cy="86" rx="46" ry="12" fill={P.cel.light} />
            <ellipse cx="50" cy="83" rx="40" ry="9" fill="#fff" />
            <circle cx="50" cy="48" r="0" />
          </g>
        )}
        <Wedge x={32} y={stage === 'emplatada' ? 74 : 80} rot={-18} fill={flesh} skin={skin} />
        <Wedge x={66} y={stage === 'emplatada' ? 74 : 80} rot={16} fill={flesh} skin={skin} />
        <Wedge x={50} y={stage === 'emplatada' ? 62 : 66} rot={0} fill={flesh} skin={skin} />
        {stage === 'cuita' && <Steam />}
        {stage === 'emplatada' && (
          <g>
            <circle cx="50" cy="44" r="7" fill={P.coral.base} />
            <path d="M50 38 Q54 28 62 26" stroke={P.llima.shade} strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <Sparkle x={18} y={36} s={0.9} />
            <Sparkle x={84} y={30} s={0.7} />
          </g>
        )}
      </g>
    )
  }
  return (
    <g>
      <Contact />
      <path d={BODY} fill={P.coral.shade} />
      <path d="M50 32 C22 22 8 50 20 73 C28 90 42 92 50 87 C58 92 72 90 80 73 C92 50 78 22 50 32Z" fill={P.coral.base} />
      <ellipse cx="33" cy="52" rx="7" ry="12" fill="#fff" opacity="0.38" transform="rotate(14 33 52)" />
      <path d="M50 34 Q48 20 54 12" stroke={P.xocolata.base} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M54 22 Q68 8 80 18 Q68 30 54 22Z" fill={P.llima.base} />
      {stage === 'crua' && (
        <g fill={P.xocolata.base} opacity="0.55">
          <circle cx="40" cy="64" r="3.2" />
          <circle cx="62" cy="58" r="2.6" />
          <circle cx="56" cy="76" r="3" />
          <circle cx="70" cy="70" r="2" />
        </g>
      )}
      {stage === 'neta' && (
        <g>
          <Sparkle x={22} y={34} />
          <Sparkle x={80} y={50} s={0.8} />
          <Sparkle x={66} y={28} s={0.6} />
        </g>
      )}
    </g>
  )
}

export function SpongeArt() {
  return (
    <g>
      <Contact rx={28} />
      <rect x="18" y="52" width="64" height="40" rx="14" fill={P.mango.shade} />
      <rect x="18" y="48" width="64" height="38" rx="14" fill={P.mango.base} />
      <rect x="18" y="72" width="64" height="14" rx="7" fill={P.llima.base} opacity="0.55" />
      {[
        [32, 58],
        [50, 64],
        [68, 57],
        [58, 54],
      ].map(([cx, cy]) => (
        <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="3.4" fill={P.mango.shade} opacity="0.6" />
      ))}
      <circle cx="26" cy="36" r="7" fill="#fff" opacity="0.8" />
      <circle cx="40" cy="26" r="5" fill="#fff" opacity="0.7" />
      <circle cx="74" cy="34" r="6" fill="#fff" opacity="0.75" />
    </g>
  )
}

export function KnifeArt() {
  return (
    <g>
      <Contact rx={30} />
      <g transform="rotate(-24 50 60)">
        <path d="M44 6 L56 6 L60 56 L40 56Z" fill="#e4eaf0" />
        <path d="M44 6 L50 6 L50 56 L40 56Z" fill="#fff" opacity="0.8" />
        <rect x="38" y="54" width="24" height="6" rx="3" fill={P.carbo.light} />
        <rect x="41" y="58" width="18" height="38" rx="9" fill={P.xocolata.base} />
        <circle cx="50" cy="68" r="2" fill={P.mango.base} />
        <circle cx="50" cy="82" r="2" fill={P.mango.base} />
      </g>
    </g>
  )
}

export function PotArt() {
  return (
    <g>
      <Contact rx={34} />
      <rect x="6" y="46" width="14" height="9" rx="4.5" fill={P.carbo.shade} />
      <rect x="80" y="46" width="14" height="9" rx="4.5" fill={P.carbo.shade} />
      <path d="M14 42 H86 V80 Q86 94 72 94 H28 Q14 94 14 80Z" fill={P.carbo.base} />
      <path d="M14 42 H34 V94 H28 Q14 94 14 80Z" fill={P.carbo.light} opacity="0.5" />
      <ellipse cx="50" cy="42" rx="36" ry="9" fill={P.carbo.shade} />
      <ellipse cx="50" cy="42" rx="30" ry="6" fill={P.mango.base} opacity="0.65" />
      <rect x="45" y="32" width="10" height="8" rx="4" fill={P.coral.base} />
    </g>
  )
}

export function PlateArt() {
  return (
    <g>
      <Contact rx={38} />
      <ellipse cx="50" cy="82" rx="44" ry="13" fill={P.cel.light} />
      <ellipse cx="50" cy="79" rx="44" ry="13" fill="#fff" />
      <ellipse cx="50" cy="79" rx="30" ry="8" fill={P.cel.light} opacity="0.7" />
      <ellipse cx="34" cy="76" rx="8" ry="2.6" fill="#fff" opacity="0.9" />
    </g>
  )
}

export function BallArt() {
  return (
    <g>
      <Contact rx={26} />
      <circle cx="50" cy="62" r="32" fill={P.coral.shade} />
      <circle cx="50" cy="60" r="32" fill={P.coral.base} />
      <path d="M22 50 Q50 36 78 50 Q80 58 76 64 Q50 50 24 64 Q20 58 22 50Z" fill="#fff" />
      <path d="M32 78 Q50 70 68 78 Q60 90 50 91 Q40 90 32 78Z" fill={P.mango.base} />
      <ellipse cx="36" cy="44" rx="6" ry="9" fill="#fff" opacity="0.4" transform="rotate(30 36 44)" />
    </g>
  )
}
