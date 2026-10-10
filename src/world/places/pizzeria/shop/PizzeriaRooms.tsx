import { useEffect } from 'react'
import { PALETTE as P } from '../../../art/palette'
import { Anchor, type AnchorState } from '../../../sandbox/Anchor'
import { useCast } from '../../../sandbox/CastContext'
import { Stage } from '../../../sandbox/Stage'
import { RoomSwitcher } from '../../shared/RoomSwitcher'
import { SliceArt } from './pizzaArt'
import { FLOOR_TOP, ROOM, ROOMS } from './rooms'

export interface PizzeriaRoomsProps {
  avatarId: string
  carrier: string | undefined
  bubbleState: AnchorState
  bubbleLabel: string
  onBubble: () => void
}

/** The room where the character she moves is. Customers in the street are not drawn. */
export function PizzeriaRooms({ avatarId, carrier, bubbleState, bubbleLabel, onBubble }: PizzeriaRoomsProps) {
  const cast = useCast()
  const mover = cast.state.actors[cast.state.selected]
  const room = ROOMS[mover?.room ?? cast.defaultRoom]
  const { select } = cast
  useEffect(() => {
    if (!room) select(avatarId)
  }, [room, select, avatarId])
  const shown = room ?? ROOMS[ROOM.dining]
  if (!shown) return null
  return (
    <Stage key={shown.id} label={shown.label} room={shown.id} floorTop={FLOOR_TOP} backdrop={shown.backdrop} blocks={shown.blocks} seats={shown.seats} doors={shown.doors} surfaces={shown.surfaces} switcher={false}>
      {shown.id === ROOM.dining && carrier && (
        <Anchor
          actorId={carrier}
          state={bubbleState}
          icon={
            <svg viewBox="0 0 100 100" width={30} height={30} aria-hidden="true" style={{ color: P.coral.base }}>
              <SliceArt />
            </svg>
          }
          label={bubbleLabel}
          onActivate={onBubble}
        />
      )}
      <RoomSwitcher className="right-3 top-3 justify-end" />
    </Stage>
  )
}
