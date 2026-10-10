import { PALETTE as P } from '../../../art/palette'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import type { CabinetDef, CabinetId } from './cabinetDefs'

/** What each screen shows while the cabinet waits for her (an attract-mode picture, drawn in the 120 × 80 screen). */
function ScreenPicture({ id, lit }: { id: CabinetId; lit: boolean }) {
  const dim = lit ? 1 : 0.55
  if (id === 'duel') {
    return (
      <g opacity={dim}>
        <rect x={8} y={14} width={104} height={18} rx={9} fill="#fff" opacity={0.85} />
        <rect x={8} y={44} width={104} height={18} rx={9} fill="#fff" opacity={0.85} />
        {[24, 44, 64, 84].map((x) => (
          <path key={x} d={`M${x} 18 l2 5 5 .5 -4 3.5 1.3 5 -4.3 -3 -4.3 3 1.3 -5 -4 -3.5 5 -.5z`} fill={P.mango.base} />
        ))}
        <circle cx={32} cy={53} r={7} fill={P.lila.base} />
        <circle cx={62} cy={23} r={7} fill={P.coral.base} />
      </g>
    )
  }
  if (id === 'tren') {
    return (
      <g opacity={dim}>
        <rect x={0} y={54} width={120} height={8} fill={P.xocolata.light} />
        <rect x={14} y={30} width={34} height={24} rx={6} fill={P.coral.base} />
        <rect x={50} y={36} width={22} height={18} rx={4} fill={P.mango.base} />
        <rect x={74} y={36} width={22} height={18} rx={4} fill={P.menta.base} />
        <circle cx={26} cy={58} r={6} fill={P.carbo.base} />
        <circle cx={60} cy={58} r={5} fill={P.carbo.base} />
        <circle cx={85} cy={58} r={5} fill={P.carbo.base} />
        <circle cx={22} cy={18} r={6} fill="#fff" opacity={0.8} />
        <circle cx={32} cy={10} r={4} fill="#fff" opacity={0.6} />
      </g>
    )
  }
  return (
    <g opacity={dim}>
      <path d="M0 40 Q30 32 60 40 T120 40 V80 H0 Z" fill={P.cel.base} opacity={0.55} />
      <path d="M22 54 q14 -14 30 0 q-14 14 -30 0 z M52 54 l10 -8 v16 z" fill={P.coral.base} />
      <path d="M78 34 q10 -9 20 0 q-10 9 -20 0 z M98 34 l7 -6 v12 z" fill={P.mango.base} />
      <path d="M96 4 V28" stroke="#fff" strokeWidth={2} />
    </g>
  )
}

export interface CabinetFrontProps {
  def: CabinetDef
  /** Room lights on: bulbs and screen glow. */
  lit: boolean
  /** Lit as «Escalfament» (the warm-up pending on the errand board). */
  warmup: boolean
  onOpen: () => void
  className?: string
}

/**
 * An illustrated arcade cabinet, standing in the room: marquee with bulbs, a glowing attract-mode screen,
 * joystick and buttons. One big button: tap (or Enter) to play.
 */
export function CabinetFront({ def, lit, warmup, onOpen, className = '' }: CabinetFrontProps) {
  const reduced = useWorldReducedMotion()
  const body = P[def.body]
  const glow = P[def.glow]
  const blink = lit && !reduced
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${def.title}${warmup ? ', escalfament' : ''}: juga`}
      data-cabinet={def.id}
      data-warmup={warmup}
      className={`group relative flex min-h-24 flex-col items-center rounded-[1.4rem] ${warmup ? 'drop-shadow-[0_0_14px_rgba(255,184,52,0.95)]' : ''} outline-none transition-transform focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-chicle)] active:translate-y-1 ${className}`}
    >
      <svg viewBox="0 0 160 280" className="h-auto w-full overflow-visible" aria-hidden="true">
        <ellipse cx={80} cy={274} rx={74} ry={7} fill="#2B2440" opacity={0.2} />
        <path d="M14 270 V40 Q14 14 40 14 H120 Q146 14 146 40 V270 Z" fill={body.base} />
        <path d="M116 14 Q146 14 146 40 V270 H122 Z" fill={body.shade} />
        <rect x={6} y={10} width={148} height={40} rx={14} fill={glow.base} />
        <rect x={6} y={38} width={148} height={12} rx={6} fill={glow.shade} />
        <text x={80} y={36} textAnchor="middle" fontFamily="var(--font-display)" fontWeight={700} fontSize={13} fill={P.carbo.base}>
          {def.title.toUpperCase()}
        </text>
        {[20, 44, 68, 92, 116, 140].map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy={18}
            r={3.2}
            fill={lit ? '#FFF7C2' : P.neu.shade}
            className={blink ? 'arcade-bulb' : undefined}
            style={{ animationDelay: `${(i % 2) * 0.5}s` }}
          />
        ))}
        <rect x={24} y={62} width={112} height={92} rx={12} fill={P.carbo.base} />
        <rect x={30} y={68} width={100} height={80} rx={8} fill={lit ? glow.light : P.carbo.light} />
        <svg x={36} y={72} width={88} height={72} viewBox="0 0 120 80" overflow="hidden">
          <ScreenPicture id={def.id} lit={lit} />
        </svg>
        <path d="M34 74 l30 -4" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.5} />
        <path d="M14 166 H146 V196 H14 Z" fill={body.light} />
        <rect x={34} y={178} width={6} height={22} rx={3} fill={P.carbo.base} />
        <circle cx={37} cy={176} r={9} fill={P.coral.base} />
        <circle cx={78} cy={186} r={8} fill={P.mango.base} />
        <circle cx={102} cy={186} r={8} fill={P.menta.base} />
        <circle cx={126} cy={186} r={8} fill={P.cel.base} />
        <rect x={56} y={216} width={48} height={20} rx={6} fill={P.carbo.base} />
        <rect x={64} y={223} width={32} height={5} rx={2.5} fill={P.mango.base} />
        <text x={80} y={258} textAnchor="middle" fontSize={22}>
          {def.emoji}
        </text>
      </svg>
    </button>
  )
}
