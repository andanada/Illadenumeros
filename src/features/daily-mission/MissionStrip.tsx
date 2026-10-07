import { motion } from 'motion/react'
import type { MissionStep } from './missionPlan'

/** Gentle progress strip: 4 stickers; finished ones get stuck on with a checkmark. */
export function MissionStrip({ steps, done }: { steps: readonly MissionStep[]; done: number }) {
  return (
    <ol aria-label={`Missió: ${done} de ${steps.length} fets`} className="flex flex-wrap justify-center gap-3">
      {steps.map((step, i) => {
        const finished = i < done
        const current = i === done
        return (
          <li key={step.id} className="flex flex-col items-center gap-1">
            <motion.span
              initial={false}
              animate={finished ? { scale: [1.3, 1], rotate: i % 2 === 0 ? -4 : 4 } : { scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 14 }}
              className={`sticker relative grid size-16 place-items-center rounded-full text-3xl ${finished ? 'bg-ok text-white' : current ? 'bg-sol' : 'bg-white/70 opacity-70'}`}
            >
              <span aria-hidden="true">{finished ? '✓' : step.emoji}</span>
            </motion.span>
            <span className={`text-base font-bold ${current ? 'text-brand-dark' : 'text-ink/60'}`}>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
