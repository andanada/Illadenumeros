import { motion, useReducedMotion } from 'motion/react'
import type { CharacterId } from '../../core/storage/db'
import { Mascot } from '../../ui/mascot/Mascot'
import { jumpLabel, type Jump } from './jumpLogic'

export interface JumpLineProps {
  lo: number
  hi: number
  /** Every position visited, start first; the last one is where the character stands. */
  positions: readonly number[]
  jumps: readonly Jump[]
  target: number
  /** The flag is only shown as a hint: the target is the answer. */
  showTarget: boolean
  character: CharacterId
  mood: 'pensa' | 'content' | 'balla' | 'anims'
}

const LINE_Y = 150

/** Number line with a hopping mascot, dashed hop arcs and a landing sticker. */
export function JumpLine({ lo, hi, positions, jumps, target, showTarget, character, mood }: JumpLineProps) {
  const reduced = useReducedMotion()
  const span = hi - lo
  const pct = (n: number): number => ((n - lo) / span) * 100
  const current = positions[positions.length - 1] as number
  const labelStep = span > 60 ? 2 : 1
  const ticks = Array.from({ length: span + 1 }, (_, i) => lo + i)
  const showOnes = span <= 40

  return (
    <div className="relative mx-auto h-60 w-full max-w-4xl px-8" role="img" aria-label={`Recta numèrica. Ets al ${current}.${showTarget ? ` La bandera és al ${target}.` : ''}`}>
      <div className="relative h-full">
        <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 240" preserveAspectRatio="none" aria-hidden="true">
          {jumps.map((_, i) => {
            const x1 = pct(positions[i] as number)
            const x2 = pct(positions[i + 1] as number)
            return (
              <path
                key={i}
                d={`M ${x1} ${LINE_Y} Q ${(x1 + x2) / 2} ${LINE_Y - 90} ${x2} ${LINE_Y}`}
                fill="none"
                stroke="var(--color-chicle)"
                strokeWidth="4"
                strokeDasharray="2 8"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>

        {jumps.map((jump, i) => (
          <span
            key={i}
            className="sticker absolute -translate-x-1/2 rounded-full bg-sol px-2.5 py-0.5 text-lg font-bold text-ink animate-pop-in"
            style={{ left: `${(pct(positions[i] as number) + pct(positions[i + 1] as number)) / 2}%`, top: LINE_Y - 82 }}
          >
            {jumpLabel(jump)}
          </span>
        ))}

        <div className="absolute inset-x-0 h-2 rounded-full bg-ink/70" style={{ top: LINE_Y }} />
        {ticks.map((n) => {
          const isTen = n % 10 === 0
          if (!isTen && !showOnes) return null
          return (
            <div key={n} className="absolute -translate-x-1/2" style={{ left: `${pct(n)}%`, top: LINE_Y - 6 }}>
              <div className={`mx-auto w-1 rounded-full bg-ink/70 ${isTen ? 'h-5' : 'h-3'}`} />
              {isTen && (n / 10) % labelStep === 0 && <p className="mt-1 text-center text-xl font-bold text-ink/80">{n}</p>}
            </div>
          )
        })}

        {showTarget && (
          <div className="absolute -translate-x-1/2 text-4xl" style={{ left: `${pct(target)}%`, top: LINE_Y - 52 }} aria-hidden="true">
            🏁
          </div>
        )}
        {positions.slice(0, -1).map((p, i) => (
          <span key={i} className="absolute size-4 -translate-x-1/2 rounded-full border-2 border-white bg-chicle" style={{ left: `${pct(p)}%`, top: LINE_Y - 4 }} aria-hidden="true" />
        ))}

        <motion.div
          className="absolute -translate-x-1/2"
          style={{ top: LINE_Y - 76 }}
          initial={false}
          animate={{ left: `${pct(current)}%` }}
          transition={{ duration: reduced ? 0 : 0.45, ease: 'easeInOut' }}
        >
          <motion.div
            key={jumps.length}
            animate={reduced ? undefined : { y: [0, -56, 0], scaleY: [1, 1.12, 0.86, 1] }}
            transition={{ duration: 0.45, times: [0, 0.5, 0.9, 1] }}
          >
            <Mascot character={character} mood={mood} size={64} />
          </motion.div>
        </motion.div>

        <motion.div
          key={`land-${jumps.length}`}
          initial={{ scale: 0.3, rotate: -14, opacity: 0 }}
          animate={{ scale: 1, rotate: -3, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 13, delay: reduced ? 0 : 0.35 }}
          className="sticker absolute -translate-x-1/2 rounded-2xl bg-white px-4 py-1 text-4xl font-bold text-brand-dark"
          style={{ left: `${pct(current)}%`, top: LINE_Y + 40 }}
        >
          {current}
        </motion.div>
      </div>
    </div>
  )
}
