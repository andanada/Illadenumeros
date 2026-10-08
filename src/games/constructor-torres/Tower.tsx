import { motion } from 'motion/react'
import { floorRows, type TowerPlan } from './towerLogic'

const FLOOR_TONES = ['bg-chicle', 'bg-cel', 'bg-menta', 'bg-sol'] as const

/** The tower, floor by floor from the ground up. A dashed outline shows the goal when building a given tower (division). */
export function Tower({ plan, built, reduced, label }: { plan: TowerPlan; built: number; reduced: boolean; label: string }) {
  const rows = floorRows(plan, built)
  const ghost = plan.kind === 'div' ? Math.max(0, plan.floors - rows.length) : 0
  return (
    <div role="img" aria-label={label} className="flex flex-col items-center gap-1">
      {Array.from({ length: ghost }, (_, i) => (
        <div key={`g${i}`} aria-hidden="true" className="flex gap-1 opacity-40">
          {Array.from({ length: plan.size }, (_, j) => (
            <span key={j} className="size-6 rounded-md border-2 border-dashed border-brand-dark" />
          ))}
        </div>
      ))}
      {[...rows].reverse().map((size, i) => {
        const floor = rows.length - 1 - i
        return (
          <motion.div
            key={floor}
            aria-hidden="true"
            initial={reduced ? false : { y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
            className="flex gap-1"
          >
            {Array.from({ length: size }, (_, j) => (
              <span key={j} className={`size-6 rounded-md border-2 border-white shadow ${FLOOR_TONES[floor % FLOOR_TONES.length]}`} />
            ))}
          </motion.div>
        )
      })}
      <div aria-hidden="true" className="h-2 w-full min-w-40 rounded-full bg-brand-dark/40" />
    </div>
  )
}
