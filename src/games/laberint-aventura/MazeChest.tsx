import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { sfx } from '../../core/audio/sfx'
import type { CharacterId } from '../../core/storage/db'
import { STICKERS } from '../../features/stickers/catalog'
import { Button } from '../../ui/Button'
import { Confetti } from '../../ui/Confetti'
import { Mascot } from '../../ui/mascot/Mascot'

export interface MazeChestProps {
  character: CharacterId
  /** Grants a new sticker and resolves with its id (undefined when the album is complete). */
  onOpen: () => Promise<string | undefined>
  onContinue: () => void
}

/** The treasure at the end of the maze: tap the chest to open it and win a sticker. */
export function MazeChest({ character, onOpen, onContinue }: MazeChestProps) {
  const reduce = useReducedMotion() ?? false
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>('closed')
  const [stickerId, setStickerId] = useState<string>()
  const sticker = STICKERS.find((s) => s.id === stickerId)

  const open = async (): Promise<void> => {
    if (phase !== 'closed') return
    setPhase('opening')
    sfx.fanfare()
    const id = await onOpen()
    setStickerId(id)
    setPhase('open')
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-4 py-6 text-center">
      {phase === 'open' && <Confetti emoji />}
      <h2 className="text-4xl font-bold tracking-tight text-brand-dark sm:text-5xl">{phase === 'open' ? 'Has trobat el tresor!' : 'Has sortit del laberint!'}</h2>
      {phase !== 'open' ? (
        <motion.button
          type="button"
          aria-label="Obrir el cofre"
          onClick={() => void open()}
          disabled={phase === 'opening'}
          animate={reduce ? undefined : phase === 'opening' ? { rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.1, 1.2] } : { y: [0, -10, 0] }}
          transition={phase === 'opening' ? { duration: 0.8 } : { duration: 1.6, repeat: Infinity }}
          className="sticker grid size-44 place-items-center rounded-[2.5rem] bg-sol text-8xl"
        >
          <span aria-hidden="true">🧰</span>
        </motion.button>
      ) : sticker ? (
        <motion.div
          initial={reduce ? false : { scale: 1.8, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: -4, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 12 }}
          role="img"
          aria-label={`Pegatina nova: ${sticker.name}`}
          className="sticker grid size-44 place-items-center rounded-[2.5rem] bg-white text-8xl"
        >
          <span aria-hidden="true">{sticker.emoji}</span>
        </motion.div>
      ) : (
        <p className="sticker rounded-[2rem] bg-white px-6 py-4 text-2xl font-bold text-brand-dark">Ja tens totes les pegatines. Ets una campiona!</p>
      )}
      {phase === 'closed' && <p className="text-2xl font-semibold text-ink/70">Toca el cofre per obrir-lo</p>}
      {phase === 'open' && sticker && <p className="text-3xl font-bold text-chicle">{sticker.name}</p>}
      <Mascot character={character} mood={phase === 'open' ? 'balla' : 'anims'} size={110} />
      {phase === 'open' && (
        <Button big tilt={-2} onClick={onContinue}>
          Continua
        </Button>
      )}
    </div>
  )
}
