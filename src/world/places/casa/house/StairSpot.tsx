import { PALETTE as P } from '../../../art/palette'
import { DoorArt } from '../../../sandbox/art/DoorArt'
import { useItems } from '../../../sandbox/ItemsContext'
import { stackOf, useStage } from '../../../sandbox/StageContext'
import type { Stair } from './stairs'

/** Steps rising to the next floor (up) or a hatch with a ladder going down. */
function Flight({ dir }: { dir: 'up' | 'down' }) {
  if (dir === 'up') {
    return (
      <svg viewBox="0 0 100 200" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 200 L0 150 L22 150 L22 120 L44 120 L44 90 L66 90 L66 60 L88 60 L88 30 L100 30 L100 200 Z" fill={P.xocolata.base} />
        <path d="M0 150 L22 150 L22 156 L0 156 Z M22 120 L44 120 L44 126 L22 126 Z M44 90 L66 90 L66 96 L44 96 Z M66 60 L88 60 L88 66 L66 66 Z" fill={P.xocolata.light} />
        <path d="M6 140 L90 20" stroke={P.neu.base} strokeWidth="6" strokeLinecap="round" />
        <path d="M6 140 L6 170 M90 20 L90 50" stroke={P.neu.base} strokeWidth="5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 100 200" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 200 L0 60 L100 60 L100 200 Z" fill={P.xocolata.shade} opacity="0.55" />
      <path d="M100 60 L100 90 L78 90 L78 120 L56 120 L56 150 L34 150 L34 180 L12 180 L12 200 L100 200 Z" fill={P.xocolata.base} />
      <path d="M96 56 L8 176" stroke={P.neu.base} strokeWidth="6" strokeLinecap="round" />
      <path d="M96 56 L96 26 M8 176 L8 146" stroke={P.neu.base} strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

/** The staircase of a floor (or the front door): tap it and the chosen character walks there and climbs. */
export function StairSpot({ stair }: { stair: Stair }) {
  const api = useItems()
  const { w, h } = useStage()
  const box = stair.box ?? { w: 0.1, h: 0.44 }
  const arrow = stair.dir === 'up' ? '▲' : stair.dir === 'down' ? '▼' : ''
  return (
    <button
      type="button"
      data-stair={stair.id}
      aria-label={stair.label}
      onClick={(e) => {
        e.stopPropagation()
        api.tapDoor(stair)
      }}
      className="absolute m-0 cursor-pointer border-0 bg-transparent p-0 outline-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--world-focus,#4da6ec)]"
      style={{ left: `${stair.at.x * 100}%`, top: `${stair.at.y * 100 + 2}%`, width: Math.max(64, box.w * w), height: Math.max(64, box.h * h), transform: 'translate(-50%, -100%)', zIndex: stackOf(stair.at.y) - 4 }}
    >
      {stair.dir === 'street' ? <DoorArt /> : <Flight dir={stair.dir} />}
      {arrow && (
        <span aria-hidden="true" className="absolute left-1/2 top-[8%] grid size-9 -translate-x-1/2 place-items-center rounded-full bg-white/90 text-base font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-soft)]">
          {arrow}
        </span>
      )}
    </button>
  )
}
