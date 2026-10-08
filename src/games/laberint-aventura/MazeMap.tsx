import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import type { CharacterId } from '../../core/storage/db'
import { Mascot } from '../../ui/mascot/Mascot'
import { mazeBranches, mazeHeight, mazePathD, mazePoints, pointAt } from './mazeLogic'

const MAX_HEIGHT_PX = 176
const EXPLORER_PX = 52

export interface MazeMapProps {
  steps: number
  seed: string
  /** Junctions already left behind. */
  done: number
  character: CharacterId
  cheering: boolean
}

/** The maze seen from above: a winding path with dead-end side paths, junction stickers and the chest at the end. */
export function MazeMap({ steps, seed, done, character, cheering }: MazeMapProps) {
  const reduce = useReducedMotion() ?? false
  const { points, branches, height } = useMemo(() => {
    const pts = mazePoints(steps, seed)
    return { points: pts, branches: mazeBranches(pts, seed), height: mazeHeight(pts) }
  }, [steps, seed])
  const here = pointAt(points, done)
  const last = points[points.length - 1]
  const widthPx = Math.round((MAX_HEIGHT_PX * 100) / height)

  return (
    <div
      role="img"
      aria-label={done >= steps ? 'Laberint: has arribat al cofre del tresor' : `Laberint: has passat ${done} encreuaments de ${steps}. Al final hi ha un cofre.`}
      className="relative mx-auto"
      style={{ width: `min(100%, ${widthPx}px)`, aspectRatio: `100 / ${height}` }}
    >
      <svg viewBox={`0 0 100 ${height}`} aria-hidden="true" className="absolute inset-0 size-full">
        <rect x="1" y="1" width="98" height={height - 2} rx="8" fill="#bbf7d0" fillOpacity="0.5" stroke="#2a1b3d" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="2 3" />
        {branches.map((b, i) => (
          <g key={i}>
            <line x1={b.from.x} y1={b.from.y} x2={b.to.x} y2={b.to.y} stroke="#2a1b3d" strokeOpacity="0.3" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 3.5" />
            <circle cx={b.to.x} cy={b.to.y} r="1.6" fill="#2a1b3d" fillOpacity="0.3" />
          </g>
        ))}
        <path d={mazePathD(points)} fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <path d={mazePathD(points)} fill="none" stroke="#2a1b3d" strokeOpacity="0.45" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.5 5" />
        {points.slice(0, -1).map((p, i) =>
          i < done ? (
            <circle key={i} cx={p.x} cy={p.y} r="3.4" fill="#ffd23f" stroke="#fff" strokeWidth="1.2" />
          ) : (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke="#8b5cf6" strokeWidth="1.2" strokeDasharray={i === done ? undefined : '1.6 1.6'} />
          ),
        )}
      </svg>
      {last && (
        <span
          aria-hidden="true"
          className="absolute -translate-x-1/2 -translate-y-1/2 text-4xl drop-shadow"
          style={{ left: `${last.x}%`, top: `${(last.y / height) * 100}%` }}
        >
          {done >= steps ? '✨' : '🧰'}
        </span>
      )}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ left: `${here.x}%`, top: `${(here.y / height) * 100}%` }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 14 }}
        className="absolute"
        style={{ width: EXPLORER_PX, height: EXPLORER_PX, marginLeft: -EXPLORER_PX / 2, marginTop: -EXPLORER_PX / 2 }}
      >
        <Mascot character={character} mood={cheering ? 'balla' : 'anims'} size={EXPLORER_PX} />
      </motion.div>
    </div>
  )
}
