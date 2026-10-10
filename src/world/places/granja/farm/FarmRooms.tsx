import { useEffect } from 'react'
import { Anchor, type AnchorState } from '../../../sandbox/Anchor'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { Stage } from '../../../sandbox/Stage'
import { RoomSwitcher } from '../../shared/RoomSwitcher'
import { FARM_FLOOR_TOP } from './rooms'
import { ROOM, ROOMS } from './rooms'

export interface FarmRoomsProps {
  avatarId: string
  carrier: string | undefined
  bubbleIcon: React.ReactNode
  bubbleNumber: number | undefined
  bubbleState: AnchorState
  bubbleLabel: string
  onBubble: () => void
}

/** Little name tags over the bowls of the request that is on (the zones themselves are the dashed rings). */
function Tags() {
  const zones = useItems((api) => api.zones)
  return (
    <>
      {Object.values(zones)
        .filter((z) => z.id.startsWith('bol-'))
        .map((z) => (
          <span
            key={z.id}
            aria-hidden="true"
            className="pointer-events-none absolute z-[2] -translate-x-1/2 whitespace-nowrap rounded-full bg-white/85 px-2 text-xs font-bold text-[var(--world-ink,#2b2440)]"
            style={{ left: `${(z.rect.x + z.rect.w / 2) * 100}%`, top: `${(z.rect.y - 0.035) * 100}%` }}
          >
            {z.label.replace(/^el bol de |^la caixa d’ous /, (m) => (m.startsWith('el') ? '' : 'Caixa '))}
          </span>
        ))}
    </>
  )
}

/** The part of the farm where the character the child moves is: the garden or the farmyard. */
export function FarmRooms({ avatarId, carrier, bubbleIcon, bubbleNumber, bubbleState, bubbleLabel, onBubble }: FarmRoomsProps) {
  const cast = useCast()
  const mover = cast.state.actors[cast.state.selected]
  const room = ROOMS[mover?.room ?? cast.defaultRoom] ?? ROOMS[ROOM.hort]
  const { select } = cast
  // Whoever she was moving went out through the gate: she takes over her own character again.
  const gone = !ROOMS[mover?.room ?? cast.defaultRoom]
  useEffect(() => {
    if (gone) select(avatarId)
  }, [gone, select, avatarId])
  if (!room) return null
  const here = carrier ? (cast.state.actors[carrier]?.room ?? cast.defaultRoom) === room.id : false
  return (
    <Stage key={room.id} label={room.label} room={room.id} floorTop={FARM_FLOOR_TOP} backdrop={room.backdrop} blocks={room.blocks} seats={room.seats} doors={room.doors} surfaces={room.surfaces} switcher={false}>
      {room.id === ROOM.hort && <Tags />}
      {here && carrier && <Anchor actorId={carrier} state={bubbleState} {...(bubbleNumber !== undefined ? { number: bubbleNumber } : {})} icon={bubbleIcon} label={bubbleLabel} onActivate={onBubble} />}
      <RoomSwitcher />
    </Stage>
  )
}
