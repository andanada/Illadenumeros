import { useEffect, useRef } from 'react'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { zoneCounts } from '../../../sandbox/logic/zones'
import { worldSfx } from '../../../scene/worldSfx'
import { GRAMS } from './items'
import { formatKg } from './priceLogic'

/** Grams of what lies in a zone (things without a weight count nothing). */
export const gramsIn = (counts: Readonly<Record<string, number>>): number => Object.entries(counts).reduce((sum, [def, n]) => sum + (GRAMS[def] ?? 0) * n, 0)

/**
 * The little screen of a scale: it reads what lies on it (the zone's goods) and says it aloud when it changes.
 * Putting things down is all the child has to do; the number is the scale's, the counting stays hers.
 */
export function ScaleReadout({ zoneId, name = 'Bàscula' }: { zoneId: string; name?: string }) {
  const zone = useItems((api) => api.zones[zoneId])
  const items = useItems((api) => api.items)
  const { announce } = useCast()
  const grams = gramsIn(zoneCounts(items, zoneId))
  const last = useRef(grams)
  useEffect(() => {
    if (last.current === grams) return
    last.current = grams
    if (grams > 0) {
      worldSfx.beep()
      announce(`La bàscula marca ${formatKg(grams)}.`)
    }
    // Only when the weight changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grams])
  if (!zone) return null
  return (
    <div
      role="status"
      aria-label={`${name}: ${formatKg(grams)}`}
      data-readout={zoneId}
      className="pointer-events-none absolute z-[3000] grid min-h-8 min-w-16 -translate-x-1/2 place-items-center rounded-lg bg-[#fff1c2] px-2 font-display text-base font-bold tabular-nums text-[#1f3a2e] shadow-[var(--world-shadow-soft)] sm:text-xl"
      style={{ left: `${(zone.rect.x + zone.rect.w / 2) * 100}%`, top: `${(zone.rect.y - 0.065) * 100}%` }}
    >
      {formatKg(grams)}
    </div>
  )
}
