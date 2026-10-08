import { motion, useReducedMotion } from 'motion/react'
import { slicePath } from '../../ui/visual/shareLogic'
import { PALETTE } from '../../ui/visual/shared'
import { sliceAngles } from './sliceLogic'

const SIZE = 100
const CENTER = 50
const RADIUS = 40
const PLAIN_SLICE = '#fff3d6'

export interface CakeProps {
  parts: number
  /** The first `selected` slices are painted. */
  selected: number
  /** Painted slices already touched while counting (0-based). */
  counted?: readonly number[]
  /** When given, the painted slices are buttons (tap or Enter/Space). */
  onSlice?: (index: number) => void
}

function label(i: number, parts: number, painted: boolean, counted: boolean): string {
  const state = painted ? (counted ? 'pintat i comptat' : 'pintat') : 'sense pintar'
  return `Tros ${i + 1} de ${parts}, ${state}`
}

/** A round cake cut in equal slices; the painted ones are the fraction. */
export function Cake({ parts, selected, counted = [], onSlice }: CakeProps) {
  const reduce = useReducedMotion() ?? false
  const slices = sliceAngles(parts)
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role={onSlice ? 'group' : 'img'}
      aria-label={`Un pastís tallat en ${parts} trossos iguals, amb ${selected} pintats`}
      className="size-64 max-w-full drop-shadow-sm sm:size-72"
    >
      <circle cx={CENTER} cy={CENTER} r="47" fill="#e8b27d" stroke="#fff" strokeWidth="4" />
      {slices.map(({ start, end }, i) => {
        const painted = i < selected
        const isCounted = counted.includes(i)
        const mid = (start + end) / 2
        const tappable = onSlice !== undefined && painted
        const body = (
          <>
            <motion.path
              d={parts === 1 ? 'M 10 50 a 40 40 0 1 0 80 0 a 40 40 0 1 0 -80 0 Z' : slicePath(CENTER, CENTER, RADIUS, start, end)}
              fill={painted ? PALETTE.a : PLAIN_SLICE}
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinejoin="round"
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ transformOrigin: '50px 50px' }}
              transition={{ delay: reduce ? 0 : i * 0.04, type: 'spring', stiffness: 300, damping: 18 }}
            />
            {isCounted && (
              <text
                x={CENTER + 24 * Math.sin(mid)}
                y={CENTER - 24 * Math.cos(mid) + 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#fff"
                aria-hidden="true"
              >
                {counted.indexOf(i) + 1}
              </text>
            )}
          </>
        )
        return tappable ? (
          <g
            key={`${parts}-${i}`}
            role="button"
            tabIndex={0}
            aria-pressed={isCounted}
            aria-label={label(i, parts, painted, isCounted)}
            className="cursor-pointer focus:outline-none [&:focus-visible>path]:stroke-[#2a1b3d]"
            onClick={() => onSlice(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSlice(i)
              }
            }}
          >
            {body}
          </g>
        ) : (
          <g key={`${parts}-${i}`} aria-hidden={onSlice ? true : undefined}>
            {body}
          </g>
        )
      })}
    </svg>
  )
}
