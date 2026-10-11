import { useItems } from '../../../sandbox/ItemsContext'
import { useStage } from '../../../sandbox/StageContext'
import { SIDES, zoneIdOf } from './clipTask'

const NAME = { esq: 'esquerra', dre: 'dreta' } as const

/** Soft patches under the two blocks of clip places on the customer's head, and under the box of clips. */
export function ClipMats() {
  const zones = useItems((api) => api.zones)
  const { room } = useStage()
  return (
    <>
      {SIDES.flatMap((side) => {
        const z = zones[zoneIdOf(side)]
        if (!z || z.room !== room) return []
        const { x, y, w, h } = z.rect
        return [
          <div key={side} aria-hidden="true" className="pointer-events-none absolute rounded-[18px] bg-white/45" style={{ left: `${(x - 0.006) * 100}%`, top: `${(y - 0.02) * 100}%`, width: `${(w + 0.012) * 100}%`, height: `${(h + 0.04) * 100}%` }}>
            <span className="absolute z-[3400] -bottom-1 left-1/2 -translate-x-1/2 translate-y-full whitespace-nowrap rounded-full bg-white/90 px-2 text-xs font-bold text-[var(--world-ink,#2b2440)]">{NAME[side]}</span>
          </div>,
        ]
      })}
    </>
  )
}
