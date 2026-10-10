import { useCast } from './CastContext'
import { DoorArt } from './art/DoorArt'
import { useItems } from './ItemsContext'
import { ofPlace, toPlace } from './logic/catalan'
import { itemsHeldBy } from './logic/itemsState'
import { depthScale, stackOf, useStage } from './StageContext'
import type { DoorDef, SeatDef, SurfaceDef } from './types'
import './sandbox.css'

const focusRing = 'outline-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--world-focus,#4da6ec)]'

function SeatSpot({ seat }: { seat: SeatDef }) {
  const cast = useCast()
  const api = useItems()
  const { w, h, floorTop } = useStage()
  const me = cast.state.actors[cast.state.selected]
  const taken = Object.entries(cast.state.actors).some(([id, a]) => a.seat === seat.id && id !== cast.state.selected)
  const mine = me?.seat === seat.id
  const scale = depthScale(seat.at.y, floorTop)
  const width = Math.min(w * 0.2, 150) * scale
  return (
    <button
      type="button"
      data-seat={seat.id}
      data-taken={taken}
      aria-label={mine ? `Aixeca’t ${ofPlace(seat.label)}` : taken ? `${seat.label}, ocupat` : `Seu ${toPlace(seat.label)}`}
      onClick={(e) => {
        e.stopPropagation()
        if (mine) api.stand()
        else api.tapSeat(seat)
      }}
      className={`absolute m-0 grid cursor-pointer place-items-center border-0 bg-transparent p-0 ${focusRing}`}
      style={{ left: `${seat.at.x * 100}%`, top: `${seat.at.y * 100}%`, width: Math.max(44, width), height: Math.max(44, h * 0.09), transform: 'translate(-50%, -78%)', zIndex: stackOf(seat.at.y) - 1 }}
    >
      {!taken && !mine && <span aria-hidden="true" className="sb-ring pointer-events-none block h-[70%] w-[88%] rounded-[50%] border-[3px] border-dashed border-white/80 bg-white/10" />}
    </button>
  )
}

function DoorSpot({ door }: { door: DoorDef }) {
  const api = useItems()
  const { w, h } = useStage()
  const box = door.box ?? { w: 0.13, h: 0.38 }
  return (
    <button
      type="button"
      data-door={door.id}
      aria-label={door.label}
      onClick={(e) => {
        e.stopPropagation()
        api.tapDoor(door)
      }}
      className={`absolute m-0 cursor-pointer border-0 bg-transparent p-0 ${focusRing}`}
      style={{ left: `${door.at.x * 100}%`, top: `${door.at.y * 100}%`, width: box.w * w, height: box.h * h, transform: 'translate(-50%, -100%)', zIndex: stackOf(door.at.y) - 2 }}
    >
      <DoorArt />
    </button>
  )
}

function SurfaceSpot({ surface }: { surface: SurfaceDef }) {
  const api = useItems()
  const cast = useCast()
  const { h } = useStage()
  const carrying = itemsHeldBy(api.items, cast.state.selected).length > 0
  if (!carrying) return null
  return (
    <button
      type="button"
      data-surface={surface.id}
      aria-label={`Deixa-ho ${toPlace(surface.label)}`}
      onClick={(e) => {
        e.stopPropagation()
        api.tapSurface(surface)
      }}
      className={`sb-bubble-bob absolute m-0 grid cursor-pointer place-items-center rounded-full border-4 border-dashed border-white bg-white/30 p-0 ${focusRing}`}
      style={{ left: `${surface.at.x * 100}%`, top: `${surface.at.y * 100}%`, width: Math.max(48, h * 0.11), height: Math.max(48, h * 0.11), transform: 'translate(-50%, -50%)', zIndex: stackOf(surface.at.y) + 3 }}
    >
      <span aria-hidden="true" className="text-2xl font-bold text-white drop-shadow">↓</span>
    </button>
  )
}

export function Hotspots({ seats, doors, surfaces }: { seats: readonly SeatDef[]; doors: readonly DoorDef[]; surfaces: readonly SurfaceDef[] }) {
  return (
    <>
      {doors.map((d) => (
        <DoorSpot key={d.id} door={d} />
      ))}
      {seats.map((s) => (
        <SeatSpot key={s.id} seat={s} />
      ))}
      {surfaces.map((s) => (
        <SurfaceSpot key={s.id} surface={s} />
      ))}
    </>
  )
}
