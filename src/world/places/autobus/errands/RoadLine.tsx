import { motion } from 'motion/react'
import { PALETTE as P } from '../../../art/palette'
import { jumpLabel, type Jump } from '../../../../games/cursa-recta/jumpLogic'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { StandingPassenger } from '../interior/Passenger'

export interface RoadLineProps {
  lo: number
  hi: number
  /** Every stop visited, start first; the last one is where the bus is. */
  positions: readonly number[]
  jumps: readonly Jump[]
  /** Numbers written under their stop (others are plain posts). */
  labelled: (n: number) => boolean
  /** Who waits where (the neighbour's friend), if anybody. */
  waitingAt?: number
  /** Flag on the stop to reach (a hint in 'go' errands). */
  flagAt?: number
  /** The number on the bus sign ('?' when it would give the answer away). */
  sign: string
  friendSeed: string
}

const ROAD_Y = 62

/** The bus line as a number line: a road with a post at every stop, the trip's arcs and the little bus. */
export function RoadLine({ lo, hi, positions, jumps, labelled, waitingAt, flagAt, sign, friendSeed }: RoadLineProps) {
  const reduced = useWorldReducedMotion()
  const span = Math.max(1, hi - lo)
  const pct = (n: number): number => 3 + ((n - lo) / span) * 94
  const current = positions[positions.length - 1] ?? lo
  const showOnes = span <= 40
  const stops = Array.from({ length: span + 1 }, (_, i) => lo + i).filter((n) => showOnes || n % 10 === 0 || labelled(n))
  const where = sign === '?' ? 'L’autobús és en una parada sense número.' : `L’autobús és a la parada ${current}.`

  return (
    <div className="relative h-40 w-full sm:h-48 lg:h-56" role="img" aria-label={`La línia de l’autobús, de la ${lo} a la ${hi}. ${where}`}>
      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {jumps.map((_, i) => {
          const x1 = pct(positions[i] ?? lo)
          const x2 = pct(positions[i + 1] ?? lo)
          return (
            <path
              key={i}
              d={`M ${x1} ${ROAD_Y - 4} Q ${(x1 + x2) / 2} ${ROAD_Y - 46} ${x2} ${ROAD_Y - 4}`}
              fill="none"
              stroke={P.rosa.shade}
              strokeWidth="3.5"
              strokeDasharray="2 7"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>
      <div className="absolute inset-x-0 h-7 rounded-full" style={{ top: `${ROAD_Y}%`, background: '#5B5672' }} />
      <div
        className="absolute inset-x-[3%] h-1 rounded-full"
        style={{
          top: `calc(${ROAD_Y}% + 12px)`,
          background: `repeating-linear-gradient(90deg, ${P.neu.base} 0 14px, transparent 14px 28px)`,
        }}
      />
      {jumps.map((jump, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute -translate-x-1/2 rounded-full bg-[var(--world-mango,#ffb834)] px-2 py-0.5 text-sm font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-soft)] sm:text-base"
          style={{ left: `${(pct(positions[i] ?? lo) + pct(positions[i + 1] ?? lo)) / 2}%`, top: `${ROAD_Y - 40}%` }}
        >
          {jumpLabel(jump)}
        </span>
      ))}
      {stops.map((n) => {
        const ten = n % 10 === 0
        return (
          <div
            key={n}
            aria-hidden="true"
            className="absolute -translate-x-1/2"
            style={{ left: `${pct(n)}%`, top: `calc(${ROAD_Y}% + 28px)` }}
          >
            <div
              className={`mx-auto w-1 rounded-full ${ten ? 'h-4 bg-[var(--world-coral,#ff6b5b)]' : 'h-2.5 bg-[var(--world-carbo,#34304a)]/60'}`}
            />
            {labelled(n) && (
              <p
                className={`text-center font-bold tabular-nums ${ten ? 'mt-0.5 text-base text-[var(--world-ink,#2b2440)] sm:text-lg' : 'mt-3 rounded-full bg-[var(--world-mango,#ffb834)] px-2 text-base text-[var(--world-ink,#2b2440)] sm:text-lg'}`}
              >
                {n}
              </p>
            )}
          </div>
        )
      })}
      {waitingAt !== undefined && (
        <div
          aria-hidden="true"
          className="absolute -translate-x-1/2 [&>svg]:h-16 [&>svg]:w-auto"
          style={{ left: `${pct(waitingAt)}%`, bottom: `${100 - ROAD_Y}%` }}
        >
          <StandingPassenger seed={friendSeed} size={64} />
        </div>
      )}
      {flagAt !== undefined && (
        <span
          aria-hidden="true"
          className="absolute -translate-x-1/2 text-3xl"
          style={{ left: `${pct(flagAt)}%`, bottom: `${100 - ROAD_Y + 2}%` }}
        >
          🏁
        </span>
      )}
      <motion.div
        className="absolute -translate-x-1/2"
        style={{ bottom: `${100 - ROAD_Y - 6}%` }}
        initial={false}
        animate={{ left: `${pct(current)}%` }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 16 }}
        data-testid="road-bus"
        data-stop={current}
      >
        <MiniBus sign={sign} />
      </motion.div>
    </div>
  )
}

/** The same yellow double-decker, small, with its number sign. */
function MiniBus({ sign }: { sign: string }) {
  return (
    <svg viewBox="0 0 120 64" className="h-14 w-auto drop-shadow-[0_4px_0_rgba(43,36,64,0.15)] sm:h-[4.5rem] lg:h-20" aria-hidden="true">
      <path d="M6 4 H100 Q116 4 116 20 V48 Q116 54 110 54 H8 Q4 54 4 50 V8 Q4 4 6 4 Z" fill={P.mango.base} />
      <rect x={4} y={40} width={112} height={14} fill={P.mango.shade} />
      {[10, 30, 70, 90].map((x) => (
        <rect key={x} x={x} y={10} width={14} height={12} rx={3} fill="#BFE6FF" />
      ))}
      <rect x={46} y={8} width={26} height={16} rx={4} fill={P.carbo.base} />
      <text x={59} y={21} textAnchor="middle" fontSize={13} fontWeight={700} fontFamily="var(--font-display)" fill={P.mango.light}>
        {sign}
      </text>
      <circle cx={26} cy={56} r={8} fill={P.carbo.base} />
      <circle cx={94} cy={56} r={8} fill={P.carbo.base} />
    </svg>
  )
}
