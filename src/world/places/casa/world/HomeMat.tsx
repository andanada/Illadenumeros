import type { Area } from '../../shared/hands/pileLayout'
import type { Rect } from '../../../sandbox/logic/zones'
import { useStage } from '../../../sandbox/StageContext'

/** What the floor shows for the request being played: the frame she fills and the pile she carries from. */
export interface HomeMats {
  readonly room: string
  readonly frame: Rect
  readonly frameLabel: string
  readonly icon: string
  readonly pile: Area
  readonly pileLabel: string
}

const chip = 'absolute z-[3400] left-1/2 top-0 -translate-x-1/2 -translate-y-[85%] whitespace-nowrap rounded-full bg-white/90 px-3 py-0.5 text-sm font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-soft)]'

/** Soft mats under the frame and the pile, with their names, so she sees where to take from and where to put. */
export function HomeMat({ mats }: { mats: HomeMats | undefined }) {
  const { room } = useStage()
  if (!mats || mats.room !== room) return null
  const { frame, pile } = mats
  return (
    <>
      <div aria-hidden="true" data-home-pile className="pointer-events-none absolute rounded-[22px] bg-[rgba(255,255,255,0.22)]" style={{ left: `${pile.x0 * 100}%`, top: `${(pile.y0 + 0.02) * 100}%`, width: `${(pile.x1 - pile.x0) * 100}%`, height: `${(pile.y1 - pile.y0 - 0.02) * 100}%` }}>
        <span className={chip}>🧺 {mats.pileLabel}</span>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute rounded-[22px] bg-[rgba(255,255,255,0.4)]" style={{ left: `${(frame.x - 0.008) * 100}%`, top: `${(frame.y - 0.02) * 100}%`, width: `${(frame.w + 0.016) * 100}%`, height: `${(frame.h + 0.04) * 100}%` }}>
        <span className={chip}>
          {mats.icon} {mats.frameLabel}
        </span>
      </div>
    </>
  )
}
