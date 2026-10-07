import { motion } from 'motion/react'
import { Counter, groupColor, gridPositions, UNIT, type VisualSize } from './shared'

const MAX_PER_GROUP = 30

function Group({ count, color, size, animate, offset }: { count: number; color: string; size: VisualSize; animate: boolean; offset: number }) {
  const cell = UNIT[size]
  const n = Math.min(Math.max(0, Math.floor(count)), MAX_PER_GROUP)
  const cols = Math.min(5, Math.max(1, n))
  const rows = Math.max(1, Math.ceil(n / cols))
  const pos = gridPositions(n, cols, cell)
  return (
    <svg
      width={cols * cell}
      height={rows * cell}
      viewBox={`0 0 ${cols * cell} ${rows * cell}`}
      role="img"
      aria-label={`${count} fitxes`}
    >
      {pos.map((p, i) => (
        <motion.g
          key={i}
          initial={animate ? { scale: 0.4, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: animate ? (offset + i) * 0.05 : 0, type: 'spring', stiffness: 380, damping: 18 }}
          style={{ transformOrigin: `${p.x}px ${p.y}px`, transformBox: 'view-box' }}
        >
          <Counter cx={p.x} cy={p.y} r={cell * 0.4} color={color} />
        </motion.g>
      ))}
    </svg>
  )
}

/** Counters grouped by colour, one tidy cluster per group. */
export function DotsView({ groups, size, animate }: { groups: number[]; size: VisualSize; animate: boolean }) {
  let offset = 0
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3" role="group" aria-label={`Grups de fitxes: ${groups.join(' i ')}`}>
      {groups.map((g, i) => {
        const start = offset
        offset += g
        return (
          <div key={i} className="rounded-3xl bg-white/70 p-2 ring-2 ring-brand-soft">
            <Group count={g} color={groupColor(i)} size={size} animate={animate} offset={start} />
          </div>
        )
      })}
    </div>
  )
}
