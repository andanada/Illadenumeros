import { motion } from 'motion/react'
import { gardenCols, hasFlower, type GardenPlan } from './gardenLogic'

/** The flower bed: rows x columns with soil cells; flowers pop in (still when motion is reduced). */
export function Garden({ plan, step, reduced, label }: { plan: GardenPlan; step: number; reduced: boolean; label: string }) {
  const cols = gardenCols(plan)
  return (
    <div role="img" aria-label={label} className="sticker rounded-3xl bg-menta/40 p-3" style={{ width: `min(100%, ${Math.max(cols, 3) * 2.2}rem)` }}>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: plan.rows * cols }, (_, i) => {
          const row = Math.floor(i / cols)
          const col = i % cols
          const flower = hasFlower(plan, step, row, col)
          return (
            <div key={i} aria-hidden="true" className="grid aspect-square place-items-center rounded-lg bg-white/60 text-xl leading-none">
              {flower && (
                <motion.span initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }}>
                  🌷
                </motion.span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
