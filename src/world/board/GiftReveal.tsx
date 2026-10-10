import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { speak } from '../../core/audio/speech'
import { PROPS_BY_ID } from '../art/props'
import type { AvatarSpec } from '../model/types'
import { Avatar, PropArt } from '../scene/art'
import { useWorldReducedMotion } from '../scene/useReducedMotion'
import { worldSfx } from '../scene/worldSfx'
import type { DayReveal as BoardReveal } from '../requests/requestStore'
import { GiftBox } from './GiftBox'
import { isWearable, wearGift } from './wearGift'

export interface GiftRevealProps {
  reveal: BoardReveal
  avatar: AvatarSpec
  /** Saves her new look («Posa-t’ho!»). */
  onWear: (spec: AvatarSpec) => void
  onClose: () => void
}

const button = 'min-h-16 rounded-full px-6 text-2xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5'

function Opened({ reveal, avatar }: { reveal: BoardReveal; avatar: AvatarSpec }) {
  if (reveal.kind === 'cheer') return <Avatar spec={avatar} pose="cheer" size={220} />
  const { entry } = reveal
  if (isWearable(entry)) return <Avatar spec={wearGift(avatar, entry)} pose="cheer" size={230} title={`El teu personatge amb ${entry.name}`} />
  if (PROPS_BY_ID[entry.id]) return <PropArt id={entry.id} size={170} />
  return <GiftBox size={170} open />
}

/** The surprise at the end of the day's board: a present to open, and what was inside. */
export function GiftReveal({ reveal, avatar, onWear, onClose }: GiftRevealProps) {
  const reduced = useWorldReducedMotion()
  const [open, setOpen] = useState(reveal.kind === 'cheer')
  const first = useRef<HTMLButtonElement | null>(null)
  const gift = reveal.kind === 'gift' ? reveal.entry : undefined
  const message = gift ? `${gift.name}! És per a tu. ${isWearable(gift) ? 'Ja és al teu armari.' : 'Ja és a casa teva.'}` : 'Has fet tots els encàrrecs d’avui!'

  useEffect(() => {
    first.current?.focus()
  }, [open])

  useEffect(() => {
    if (open) speak(message)
  }, [open, message])

  return (
    <div role="dialog" aria-modal="true" aria-label="Sorpresa!" className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(43,36,64,0.55)] p-4">
      <motion.div
        initial={reduced ? false : { scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="flex w-full max-w-md flex-col items-center gap-4 rounded-[32px] bg-[var(--world-surface)] p-6 text-center shadow-[var(--world-shadow-lift)]"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 35%, #FFE7A8 0, transparent 60%)' }}
      >
        <h2 className="text-4xl font-bold text-[var(--world-coral)]">Sorpresa!</h2>
        {open ? (
          <>
            <motion.div initial={reduced ? false : { y: 30, scale: 0.6 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }}>
              <Opened reveal={reveal} avatar={avatar} />
            </motion.div>
            <p role="status" className="text-2xl font-bold leading-snug text-[var(--world-ink)]">
              {message}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {gift && isWearable(gift) && (
                <button
                  ref={first}
                  type="button"
                  onClick={() => {
                    worldSfx.happy()
                    onWear(wearGift(avatar, gift))
                    onClose()
                  }}
                  className={`${button} bg-[var(--world-menta)] text-white`}
                >
                  Posa-t’ho!
                </button>
              )}
              <button ref={gift && isWearable(gift) ? undefined : first} type="button" onClick={onClose} className={`${button} bg-[var(--world-coral)] text-white`}>
                Que bé!
              </button>
            </div>
          </>
        ) : (
          <>
            <motion.div animate={reduced ? undefined : { rotate: [0, -6, 6, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.6 }}>
              <GiftBox size={190} />
            </motion.div>
            <p className="text-2xl font-bold text-[var(--world-ink)]">Has fet tots els encàrrecs d’avui!</p>
            <button
              ref={first}
              type="button"
              onClick={() => {
                worldSfx.kaching()
                setOpen(true)
              }}
              className={`${button} bg-[var(--world-mango)] text-[var(--world-carbo)]`}
            >
              Obre el regal
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}
