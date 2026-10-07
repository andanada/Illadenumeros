import { motion } from 'motion/react'
import { useState } from 'react'
import { sfx } from '../../core/audio/sfx'
import type { CharacterId } from '../../core/storage/db'
import { Button } from '../../ui/Button'
import { Confetti } from '../../ui/Confetti'
import { Mascot } from '../../ui/mascot/Mascot'
import { STICKERS } from '../stickers/catalog'

export interface ChestSceneProps {
  character: CharacterId
  /** True when today's reward was already given: no new chest, just a celebration. */
  alreadyRewarded: boolean
  onOpen: () => Promise<string | undefined>
  onMap: () => void
  onAlbum: () => void
}

export function ChestScene({ character, alreadyRewarded, onOpen, onMap, onAlbum }: ChestSceneProps) {
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>(alreadyRewarded ? 'open' : 'closed')
  const [stickerId, setStickerId] = useState<string>()
  const sticker = STICKERS.find((s) => s.id === stickerId)

  const open = async () => {
    if (phase !== 'closed') return
    setPhase('opening')
    sfx.fanfare()
    const id = await onOpen()
    setStickerId(id)
    setPhase('open')
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      {phase === 'open' && <Confetti emoji />}
      <h2 className="text-5xl font-bold tracking-tight text-brand-dark">
        {phase === 'open' ? 'Missió complerta!' : 'Has acabat la missió!'}
      </h2>

      {phase !== 'open' ? (
        <motion.button
          type="button"
          aria-label="Obrir el cofre"
          onClick={() => void open()}
          animate={phase === 'opening' ? { rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.1, 1.2] } : { y: [0, -10, 0] }}
          transition={phase === 'opening' ? { duration: 0.8 } : { duration: 1.6, repeat: Infinity }}
          className="sticker grid size-48 place-items-center rounded-[2.5rem] bg-sol text-8xl"
        >
          <span aria-hidden="true">🧰</span>
        </motion.button>
      ) : sticker ? (
        <motion.div
          initial={{ scale: 1.8, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: -4, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 12 }}
          role="img"
          aria-label={`Pegatina nova: ${sticker.name}`}
          className="sticker grid size-48 place-items-center rounded-[2.5rem] bg-white text-8xl"
        >
          <span aria-hidden="true">{sticker.emoji}</span>
        </motion.div>
      ) : (
        <p className="sticker rounded-[2rem] bg-white px-6 py-4 text-2xl font-bold text-brand-dark">
          {alreadyRewarded ? 'Ja tenies la pegatina d’avui. Bona feina!' : 'Ja tens totes les pegatines. Ets una campiona!'}
        </p>
      )}

      {phase === 'open' && sticker && <p className="text-3xl font-bold text-chicle">{sticker.name}</p>}
      {phase === 'closed' && <p className="text-2xl font-semibold text-ink/70">Toca el cofre per obrir-lo</p>}

      <Mascot character={character} mood={phase === 'open' ? 'balla' : 'anims'} size={130} />

      {phase === 'open' && (
        <div className="flex flex-wrap justify-center gap-4">
          <Button big tilt={-2} onClick={onMap}>
            Tornar al mapa
          </Button>
          <Button big variant="soft" tilt={2} onClick={onAlbum}>
            Veure l’àlbum
          </Button>
        </div>
      )}
    </div>
  )
}
