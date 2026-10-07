import { motion } from 'motion/react'

export interface ReadLineProps {
  from: number
  to: number
  target: number
  /** Show every tick number (hint). */
  labelAll: boolean
  /** Reveal the arrow's number. */
  revealed: boolean
}

/** Number line with a bouncing arrow: "Quin número assenyala la fletxa?" */
export function ReadLine({ from, to, target, labelAll, revealed }: ReadLineProps) {
  const span = to - from
  const ticks = Array.from({ length: span + 1 }, (_, i) => from + i)
  const pct = (n: number): number => ((n - from) / span) * 100
  return (
    <div className="relative mx-auto h-44 w-full max-w-3xl px-8" role="img" aria-label={`Recta numèrica del ${from} al ${to}. Una fletxa assenyala un número.`}>
      <div className="relative h-full">
        <motion.div
          className="absolute -translate-x-1/2 text-center"
          style={{ left: `${pct(target)}%`, top: 6 }}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="sticker rounded-2xl bg-chicle px-3 py-0.5 text-3xl font-bold text-white">{revealed ? target : '?'}</div>
          <div className="text-4xl leading-none text-chicle" aria-hidden="true">▼</div>
        </motion.div>
        <div className="absolute inset-x-0 h-2 rounded-full bg-ink/70" style={{ top: 96 }} />
        {ticks.map((n) => {
          const edge = n === from || n === to
          return (
            <div key={n} className="absolute -translate-x-1/2" style={{ left: `${pct(n)}%`, top: 90 }}>
              <div className={`mx-auto w-1 rounded-full bg-ink/70 ${edge ? 'h-8' : 'h-5'}`} />
              {(edge || labelAll) && <p className={`mt-1 text-center font-bold text-ink/80 ${edge ? 'text-2xl' : 'text-lg'}`}>{n}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
