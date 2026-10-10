import { INK, PALETTE as P } from '../art/palette'
import type { EmoteKind } from './logic/actorMachine'

const FACE = '#FFD25E'
const FACE_SHADE = '#F2A93B'

function Face({ children }: { children: React.ReactNode }) {
  return (
    <g>
      <circle cx="28" cy="29" r="22" fill={FACE_SHADE} />
      <circle cx="28" cy="27" r="22" fill={FACE} />
      {children}
    </g>
  )
}

const Heart = ({ x = 28, y = 28, s = 1, fill = P.coral.base }: { x?: number; y?: number; s?: number; fill?: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 20 C-26 2 -14 -22 0 -8 C14 -22 26 2 0 20Z" fill={fill} />
)

/** Tiny flat emote pictures (no emoji font needed), 56 × 56. */
export function EmoteIcon({ kind, size = 56 }: { kind: EmoteKind; size?: number }) {
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} aria-hidden="true">
      {kind === 'cor' && (
        <g>
          <Heart y={30} s={1.1} fill={P.coral.shade} />
          <Heart y={27} s={1.1} />
          <ellipse cx="18" cy="17" rx="5" ry="3" fill={INK.white} opacity="0.55" transform="rotate(-30 18 17)" />
        </g>
      )}
      {kind === 'riure' && (
        <Face>
          <path d="M14 22 Q19 16 24 22M32 22 Q37 16 42 22" stroke={INK.face} strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <path d="M14 32 Q28 52 42 32Z" fill={INK.mouthInside} />
          <path d="M20 40 Q28 36 36 40 Q28 47 20 40Z" fill={INK.tongue} />
          <circle cx="47" cy="30" r="3.2" fill="#6FC8FF" />
        </Face>
      )}
      {kind === 'uau' && (
        <Face>
          <circle cx="19" cy="23" r="4.4" fill={INK.face} />
          <circle cx="37" cy="23" r="4.4" fill={INK.face} />
          <circle cx="20.4" cy="21.6" r="1.4" fill={INK.white} />
          <circle cx="38.4" cy="21.6" r="1.4" fill={INK.white} />
          <ellipse cx="28" cy="40" rx="5.5" ry="7" fill={INK.mouthInside} />
        </Face>
      )}
      {kind === 'son' && (
        <g>
          <Face>
            <path d="M13 25 Q19 29 25 25M31 25 Q37 29 43 25" stroke={INK.face} strokeWidth="3.2" strokeLinecap="round" fill="none" />
            <ellipse cx="28" cy="40" rx="4" ry="3" fill={INK.mouthInside} />
          </Face>
          <text x="40" y="14" fontFamily="var(--font-display)" fontWeight="700" fontSize="16" fill={P.lila.shade}>
            z
          </text>
          <text x="47" y="7" fontFamily="var(--font-display)" fontWeight="700" fontSize="11" fill={P.lila.base}>
            z
          </text>
        </g>
      )}
      {kind === 'salut' && (
        <g>
          <circle cx="28" cy="30" r="22" fill={P.cel.light} />
          <path d="M20 40 L18 22 Q18 18 22 20 L24 30 L25 14 Q26 10 29 12 L30 28 L33 16 Q35 13 37 15 L36 32 L40 24 Q43 22 44 25 L40 42 Q36 50 28 48Z" fill={FACE} stroke={FACE_SHADE} strokeWidth="2" strokeLinejoin="round" />
        </g>
      )}
      {kind === 'abraca' && (
        <g>
          <Heart x={20} y={32} s={0.85} fill={P.rosa.base} />
          <Heart x={36} y={28} s={0.85} />
          <circle cx="45" cy="12" r="3" fill={P.mango.base} />
          <circle cx="10" cy="14" r="2.4" fill={P.mango.base} />
        </g>
      )}
      {kind === 'xoca' && (
        <g>
          <path d="M28 6 L31 18 L43 14 L36 25 L48 30 L35 33 L40 46 L28 38 L16 46 L21 33 L8 30 L20 25 L13 14 L25 18Z" fill={P.mango.base} />
          <path d="M28 14 L30 22 L38 20 L33 27 L40 30 L32 32 L35 39 L28 34 L21 39 L24 32 L16 30 L23 27 L18 20 L26 22Z" fill={P.mango.light} />
        </g>
      )}
    </svg>
  )
}
