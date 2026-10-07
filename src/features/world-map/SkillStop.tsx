import { memo } from 'react'
import { motion } from 'motion/react'
import type { SkillNode } from '../../core/ambit/types'
import type { Stars, StopStatus } from './stops'

function StarRow({ stars }: { stars: Stars }) {
  return (
    <span aria-hidden="true" className="flex gap-0.5 text-lg leading-none">
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= stars ? '' : 'opacity-30 grayscale'}>
          ⭐
        </span>
      ))}
    </span>
  )
}

export interface SkillStopProps {
  skill: SkillNode
  status: StopStatus
  stars: Stars
  focus: boolean
  tilt: number
  onOpen: (skill: SkillNode) => void
}

/** One stop on the path: a round sticker with its code, plus the skill name beside it. */
export const SkillStop = memo(function SkillStop({ skill, status, stars, focus, tilt, onOpen }: SkillStopProps) {
  const locked = status === 'locked'
  const label = locked
    ? `${skill.title}: bloquejat, acaba abans els passos anteriors`
    : `${skill.title}: ${stars} de 3 estrelles`
  return (
    <div className="flex items-center gap-3">
      <motion.button
        type="button"
        aria-label={label}
        aria-disabled={locked}
        whileTap={locked ? { x: [0, -4, 4, 0] } : { scale: 0.92, rotate: 0 }}
        whileHover={locked ? undefined : { scale: 1.06 }}
        onClick={() => !locked && onOpen(skill)}
        style={{ rotate: tilt }}
        className={`sticker relative grid size-[4.5rem] shrink-0 place-items-center rounded-full text-2xl font-bold ${
          locked ? 'bg-white/70 text-ink/40' : status === 'new' ? 'bg-sol text-ink' : 'bg-brand text-white'
        } ${focus ? 'ring-4 ring-chicle ring-offset-2' : ''}`}
      >
        {locked ? '🔒' : skill.code}
        {focus && (
          <span aria-hidden="true" className="pointer-events-none absolute -inset-2 animate-ping rounded-full border-[5px] border-sol opacity-70" />
        )}
      </motion.button>
      <div className="flex min-w-0 flex-col items-start">
        <span className={`text-lg font-bold leading-tight sm:text-xl ${locked ? 'text-ink/40' : 'text-brand-dark'}`}>{skill.title}</span>
        {!locked && <StarRow stars={stars} />}
      </div>
    </div>
  )
})
