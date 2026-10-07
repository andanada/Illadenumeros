import { motion } from 'motion/react'
import type { CharacterId } from '../../core/storage/db'
import { Mascot } from '../../ui/mascot/Mascot'

const STARS = 12

/** One lane of the cute race: a trail of stars with the character moving along it. */
export function Lane({ character, progress, label, glow }: { character: CharacterId; progress: number; label: string; glow?: boolean }) {
  const p = Math.min(1, Math.max(0, progress))
  const collected = Math.floor(p * STARS)
  return (
    <div role="img" aria-label={label} className="relative h-16 w-full rounded-full bg-white/70 px-5 ring-2 ring-brand-soft">
      <div className="absolute inset-x-6 top-1/2 flex -translate-y-1/2 justify-between" aria-hidden="true">
        {Array.from({ length: STARS }, (_, i) => (
          <span key={i} className={`text-xl transition-opacity ${i < collected ? 'opacity-25' : 'opacity-100'}`}>
            ⭐
          </span>
        ))}
      </div>
      <motion.div
        className="absolute top-[-10px]"
        initial={false}
        animate={{ left: `calc(${p * 100}% * 0.86)` }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        style={{ filter: glow ? 'drop-shadow(0 0 8px #ffd23f)' : undefined }}
      >
        <Mascot character={character} mood={glow ? 'content' : 'anims'} size={56} />
      </motion.div>
    </div>
  )
}

/** Remaining time as a shrinking star trail: no numbers. */
export function TimeTrail({ remaining }: { remaining: number }) {
  const total = 10
  const lit = Math.ceil(Math.min(1, Math.max(0, remaining)) * total)
  return (
    <ol className="flex items-center gap-1" aria-label="Temps que queda">
      {Array.from({ length: total }, (_, i) => (
        <li key={i} aria-hidden="true">
          <motion.span
            initial={false}
            animate={{ scale: i < lit ? 1 : 0.5, opacity: i < lit ? 1 : 0.2 }}
            className="block text-2xl"
          >
            ✨
          </motion.span>
        </li>
      ))}
    </ol>
  )
}
