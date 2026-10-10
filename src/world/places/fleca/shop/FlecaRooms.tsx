import { useEffect } from 'react'
import { Anchor, type AnchorState } from '../../../sandbox/Anchor'
import { useCast } from '../../../sandbox/CastContext'
import { Stage } from '../../../sandbox/Stage'
import { RoomSwitcher } from '../../shared/RoomSwitcher'
import { ProductIcon } from './ProductIcon'
import { FLOOR_TOP, ROOM, ROOMS } from './rooms'

export interface FlecaRoomsProps {
  avatarId: string
  carrier: string | undefined
  product: string
  bubbleState: AnchorState
  bubbleLabel: string
  onBubble: () => void
}

/** The room where the character she moves is. Customers in the street are not drawn. */
export function FlecaRooms({ avatarId, carrier, product, bubbleState, bubbleLabel, onBubble }: FlecaRoomsProps) {
  const cast = useCast()
  const mover = cast.state.actors[cast.state.selected]
  const room = ROOMS[mover?.room ?? cast.defaultRoom]
  const { select } = cast
  useEffect(() => {
    if (!room) select(avatarId)
  }, [room, select, avatarId])
  const shown = room ?? ROOMS[ROOM.shop]
  if (!shown) return null
  return (
    <Stage key={shown.id} label={shown.label} room={shown.id} floorTop={FLOOR_TOP} backdrop={shown.backdrop} blocks={shown.blocks} seats={shown.seats} doors={shown.doors} surfaces={shown.surfaces} switcher={false}>
      {shown.id === ROOM.shop && carrier && <Anchor actorId={carrier} state={bubbleState} icon={<ProductIcon id={product} />} label={bubbleLabel} onActivate={onBubble} />}
      <RoomSwitcher className="right-3 top-3 justify-end" />
    </Stage>
  )
}
