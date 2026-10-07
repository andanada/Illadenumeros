import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { SkillNode } from '../../core/ambit/types'
import { Button } from '../../ui/Button'
import { GAME_EMOJI } from '../play/gameMeta'
import { GAME_TITLES } from '../play/gameTypes'
import type { Stars } from './stops'

export interface StopSheetProps {
  skill: SkillNode
  stars: Stars
  onPlay: (gameId: string) => void
  onClose: () => void
}

/** Sticker sheet that peels onto the map: pick one of the games for this skill. */
export function StopSheet({ skill, stars, onPlay, onClose }: StopSheetProps) {
  const first = useRef<HTMLDivElement>(null)

  useEffect(() => {
    first.current?.querySelector('button')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-30 grid place-items-end bg-ink/40 p-3 sm:place-items-center" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={skill.title}
        initial={{ y: 60, scale: 0.9, rotate: -4, opacity: 0 }}
        animate={{ y: 0, scale: 1, rotate: -1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="sticker w-full max-w-md rounded-[2rem] bg-white p-5"
      >
        <div className="mb-4 text-center">
          <h2 className="text-3xl font-bold leading-tight text-brand-dark">{skill.title}</h2>
          <p aria-hidden="true" className="mt-1 text-2xl">
            {[1, 2, 3].map((n) => (
              <span key={n} className={n <= stars ? '' : 'opacity-30 grayscale'}>
                ⭐
              </span>
            ))}
          </p>
        </div>
        <div ref={first} className="flex flex-col gap-3">
          {skill.games.map((id, i) => (
            <Button key={id} variant={i === 0 ? 'primary' : 'soft'} tilt={i % 2 === 0 ? -1.5 : 1.5} className="flex items-center justify-center gap-3" onClick={() => onPlay(id)}>
              <span aria-hidden="true">{GAME_EMOJI[id] ?? '🎮'}</span>
              {GAME_TITLES[id] ?? id}
            </Button>
          ))}
        </div>
        <Button variant="ghost" className="mt-2 w-full text-xl" onClick={onClose}>
          Ara no
        </Button>
      </motion.div>
    </div>
  )
}
