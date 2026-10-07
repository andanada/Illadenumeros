import { memo } from 'react'
import type { SkillNode } from '../../core/ambit/types'
import type { SkillState } from '../../core/engine/mastery'
import { RegionLandscape } from './RegionLandscape'
import { SkillStop } from './SkillStop'
import { GRADE_LABEL, isRegionClosed, REGIONS, starsFor, stopStatus, type Region } from './stops'

const STEP = 112
const TOP = 124

/** Gentle zig-zag along the left side so labels always fit on the right, even at 360px. */
const xPercent = (i: number): number => 21 + 8 * Math.sin(i * 1.25)

function pathD(count: number): string {
  const points = Array.from({ length: count }, (_, i) => [xPercent(i), TOP + i * STEP + 36] as const)
  return points
    .map(([x, y], i) => {
      const prev = points[i - 1]
      if (!prev) return `M ${x} ${y}`
      const midY = (prev[1] + y) / 2
      return `C ${prev[0]} ${midY} ${x} ${midY} ${x} ${y}`
    })
    .join(' ')
}

export interface RegionSectionProps {
  region: Region
  skills: readonly SkillNode[]
  states: Readonly<Record<string, SkillState>>
  focusId: string
  onOpen: (skill: SkillNode) => void
}

/** A playable region: wobbly tinted island, a landmark sticker, and a dashed path of stops. */
export const RegionSection = memo(function RegionSection({ region, skills, states, focusId, onOpen }: RegionSectionProps) {
  const height = TOP + skills.length * STEP + 24
  const previous = REGIONS.find((r) => r.grade === region.grade - 1)
  const closed = previous !== undefined && isRegionClosed(skills, states)
  return (
    <section
      aria-labelledby={`r-${region.id}`}
      data-region={region.id}
      className="relative [content-visibility:auto]"
      style={{ height, containIntrinsicSize: `auto ${height}px` }}
    >
      <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        <path
          d={`M 3 14 Q 30 0 60 8 T 97 16 Q 101 ${height / 2} 95 ${height - 18} Q 60 ${height + 2} 30 ${height - 10} T 2 ${height - 30} Q -2 ${height / 2} 3 14 Z`}
          fill={region.tint}
          fillOpacity="0.55"
          stroke="#2a1b3d"
          strokeOpacity="0.25"
          strokeWidth="2"
          strokeDasharray="2 7"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path d={pathD(skills.length)} fill="none" stroke="#2a1b3d" strokeOpacity="0.35" strokeWidth="5" strokeDasharray="1 11" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>

      <RegionLandscape regionId={region.id} className="pointer-events-none absolute right-2 top-2 h-auto w-24 sm:w-44" />
      <div className="relative flex items-center gap-3 px-4 pt-3 pr-28 sm:pr-48">
        <span aria-hidden="true" className="sticker grid size-16 -rotate-6 place-items-center rounded-2xl bg-white text-4xl">
          {region.emoji}
        </span>
        <div>
          <h2 id={`r-${region.id}`} className="text-xl font-bold leading-tight text-brand-dark sm:text-3xl">
            {region.name}
          </h2>
          <p className="text-base font-semibold text-ink/60">{GRADE_LABEL[region.grade]} de primària</p>
          {closed && <p className="text-base font-bold text-brand-dark">Domina «{previous.name}» per obrir-la</p>}
        </div>
      </div>

      {skills.map((skill, i) => (
        <div key={skill.id} className="absolute -translate-y-1/2" style={{ left: `calc(${xPercent(i)}% - 36px)`, top: TOP + i * STEP + 36 }}>
          <SkillStop
            skill={skill}
            status={stopStatus(skill, states)}
            stars={starsFor(states[skill.id])}
            focus={skill.id === focusId}
            tilt={i % 2 === 0 ? -4 : 4}
            onOpen={onOpen}
          />
        </div>
      ))}
    </section>
  )
})
