import { motion, useReducedMotion } from 'motion/react'
import { shareSplit } from './shareLogic'
import { UNIT, type VisualSize } from './shared'
import { plateLayout } from './plateLayout'
import { Candy, PlateShape } from './Treats'

const MAX_GROUPS = 10
const MAX_TOTAL = 120
/** Candies drawn on one plate; above this a count badge tells the real number. */
const MAX_DRAWN = 10

/** `total` candies shared fairly onto `groups` plates; the ones that do not fit sit apart as "sobren". */
export function ShareView({ total, groups, size, animate }: { total: number; groups: number; size: VisualSize; animate: boolean }) {
  const reduce = useReducedMotion() ?? false
  const moving = animate && !reduce
  const split = shareSplit(Math.min(MAX_TOTAL, total), Math.min(MAX_GROUPS, groups))
  const plate = Math.round(UNIT[size] * 3.6)
  const drawn = Math.min(split.perPlate, MAX_DRAWN)
  const layout = plateLayout(drawn, plate, Math.round(plate / 2.8))
  const candy = Math.max(18, Math.round(plate / 3.2))
  const label = `${total} llaminadures repartides en ${split.groups} plats: ${split.perPlate} a cada plat${split.leftover > 0 ? ` i en sobren ${split.leftover}` : ''}`
  return (
    <div role="img" aria-label={label} className="flex max-w-xl flex-col items-center gap-3 rounded-3xl bg-white/70 p-3 ring-2 ring-brand-soft">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {Array.from({ length: split.groups }, (_, g) => (
          <div key={g} className="relative shrink-0" style={{ width: plate, height: plate }}>
            <PlateShape size={plate} />
            {layout.positions.map((p, i) => (
              <motion.span
                key={i}
                initial={moving ? { scale: 0, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: moving ? (g + i * split.groups) * 0.05 : 0, type: 'spring', stiffness: 400, damping: 16 }}
                className="absolute"
                style={{ left: plate / 2 + p.x - layout.candy / 2, top: plate / 2 + p.y - layout.candy / 2 }}
              >
                <Candy size={layout.candy} tone={g} />
              </motion.span>
            ))}
            {split.perPlate > MAX_DRAWN && (
              <span aria-hidden="true" className="sticker absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-sol text-lg font-bold text-ink">
                {split.perPlate}
              </span>
            )}
          </div>
        ))}
      </div>
      {split.leftover > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border-4 border-dashed border-almost/60 bg-almost/10 px-3 py-1">
          <span className="text-lg font-bold text-almost">sobren</span>
          {Array.from({ length: split.leftover }, (_, i) => (
            <Candy key={i} size={candy} tone={i} />
          ))}
        </div>
      )}
    </div>
  )
}
