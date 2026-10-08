import { motion } from 'motion/react'
import type { CharacterId } from '../../core/storage/db'
import { Mascot } from '../../ui/mascot/Mascot'

const PUFFS = 4

/** The cute train on its track. Position = trip progress, puffs = steam. Purely decorative (static accessible name). */
export function TrainTrack({ progress, steam, character, reduced }: { progress: number; steam: number; character: CharacterId; reduced: boolean }) {
  const p = Math.min(1, Math.max(0, progress))
  const puffs = Math.round(steam * PUFFS)
  return (
    <div role="img" aria-label="El tren avança cap a l’estació" className="relative h-28 w-full max-w-3xl rounded-[2rem] bg-white/70 ring-2 ring-brand-soft">
      <div aria-hidden="true" className="absolute inset-x-6 bottom-5 h-2 rounded-full bg-ink/25" />
      <div aria-hidden="true" className="absolute inset-x-6 bottom-3 flex justify-between">
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} className="h-4 w-1.5 rounded bg-ink/20" />
        ))}
      </div>
      <span aria-hidden="true" className="absolute bottom-3 right-3 text-5xl">
        🏠
      </span>
      <motion.div
        aria-hidden="true"
        className="absolute bottom-4 flex items-end"
        initial={false}
        animate={{ left: `calc(${p * 100}% * 0.72 + 0.75rem)` }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 14 }}
      >
        <span className="relative text-5xl leading-none">
          🚂
          <span className="absolute -top-5 left-0 flex text-xl" data-testid="steam-puffs" data-puffs={puffs}>
            {Array.from({ length: puffs }, (_, i) => (
              <span key={i} className="opacity-80">
                ☁️
              </span>
            ))}
          </span>
        </span>
        <span className="-ml-2 mb-1">
          <Mascot character={character} mood="content" size={44} />
        </span>
      </motion.div>
    </div>
  )
}
