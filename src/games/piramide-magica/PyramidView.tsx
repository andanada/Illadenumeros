import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../shared/speed/usePrefersReducedMotion'
import { describePyramid, type Pyramid } from './pyramidLogic'

const ROW_COLORS = ['bg-sol', 'bg-chicle', 'bg-cel'] as const

/** The pyramid of blocks: the hidden block shows the child's guess (or "?") and glows when it is right. */
export function PyramidView({ pyramid, shown, solved }: { pyramid: Pyramid; shown: number | null; solved: boolean }) {
  const reduced = usePrefersReducedMotion()
  return (
    <div role="img" aria-label={describePyramid(pyramid, shown)} data-testid="pyramid" className="flex flex-col items-center gap-2 py-2">
      {pyramid.map((row, r) => (
        <div key={r} className="flex justify-center gap-2">
          {row.map((c, i) => {
            const label = c.hidden ? (shown === null ? '?' : String(shown)) : String(c.value)
            const right = c.hidden && shown === c.value
            return (
              <motion.span
                key={i}
                data-testid={c.hidden ? 'hidden-block' : undefined}
                animate={right && !reduced ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
                className={`sticker grid size-[4.75rem] place-items-center rounded-2xl text-4xl font-bold text-ink ${
                  c.hidden ? `border-4 border-dashed ${right || solved ? 'border-ok bg-ok/20' : 'border-brand bg-white'}` : (ROW_COLORS[r % ROW_COLORS.length] ?? 'bg-sol')
                }`}
              >
                {label}
              </motion.span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
