import { useCast } from './CastContext'
import { useItems } from './ItemsContext'
import { itemsHeldBy } from './logic/itemsState'
import { slotPoints, zoneItems, zoneTotal } from './logic/zones'
import { stackOf, useStage } from './StageContext'
import type { ZoneDef } from './zoneTypes'
import './sandbox.css'

const focusRing = 'outline-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--world-focus,#4da6ec)]'

function ZoneView({ zone }: { zone: ZoneDef }) {
  const api = useItems()
  const cast = useCast()
  const { h, unit } = useStage()
  const held = itemsHeldBy(api.items, cast.state.selected)[0]
  const fits = held !== undefined && (zone.accepts?.(held.def) ?? true)
  const total = zoneTotal(api.items, zone.id)
  const slots = slotPoints(zone)
  const taken = new Set(zoneItems(api.items, zone.id).map((i) => (i.loc.t === 'floor' ? `${i.loc.at.x.toFixed(3)}/${i.loc.at.y.toFixed(3)}` : '')))
  const { x, y, w, h: rh } = zone.rect
  const dot = Math.max(14, unit * 0.045)
  return (
    <div
      role="group"
      aria-label={zone.label}
      data-zone={zone.id}
      data-count={total}
      className="pointer-events-none absolute"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${rh * 100}%`, zIndex: stackOf(y + rh) + (fits ? 85 : -4) }}
    >
      <span aria-hidden="true" className={`absolute inset-0 rounded-[18px] border-[3px] border-dashed ${fits ? 'sb-ring border-white bg-white/25' : zone.quiet ? 'border-transparent' : 'border-white/45 bg-white/10'}`} />
      {!zone.quiet &&
        slots.map((p) => (
          <span
            key={`${p.x}/${p.y}`}
            aria-hidden="true"
            className="absolute rounded-[50%] bg-white/30"
            style={{ left: `${((p.x - x) / w) * 100}%`, top: `${((p.y - y) / rh) * 100}%`, width: dot, height: dot * 0.5, transform: 'translate(-50%, -50%)', opacity: taken.has(`${p.x.toFixed(3)}/${p.y.toFixed(3)}`) ? 0 : 1 }}
          />
        ))}
      {fits && (
        <button
          type="button"
          data-zone-drop={zone.id}
          aria-label={`Deixa-ho ${zone.label.startsWith('el ') ? 'al ' + zone.label.slice(3) : 'a ' + zone.label}`}
          onClick={(e) => {
            e.stopPropagation()
            api.tapZone(zone.id)
          }}
          className={`pointer-events-auto absolute inset-0 m-0 cursor-pointer rounded-[18px] border-0 bg-transparent p-0 ${focusRing}`}
          style={{ zIndex: 1 }}
        />
      )}
      {zone.showCount && (
        <span data-zone-badge={zone.id} className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 text-lg font-bold text-[#3a2d63] shadow-[var(--world-shadow-soft)]" style={{ fontSize: Math.max(16, h * 0.04) }}>
          {total}
        </span>
      )}
    </div>
  )
}

/** The counting zones of this stage's room. */
export function Zones() {
  const zones = useItems((api) => api.zones)
  const { room } = useStage()
  return (
    <>
      {Object.values(zones)
        .filter((z) => z.room === room)
        .map((z) => (
          <ZoneView key={z.id} zone={z} />
        ))}
    </>
  )
}
