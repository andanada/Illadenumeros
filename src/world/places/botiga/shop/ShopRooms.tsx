import { useEffect } from 'react'
import { PropArt } from '../../../art/props'
import { Anchor, type AnchorState } from '../../../sandbox/Anchor'
import { useCast } from '../../../sandbox/CastContext'
import { Stage } from '../../../sandbox/Stage'
import { RoomSwitcher } from '../../shared/RoomSwitcher'
import { Readouts } from './Readouts'
import { ROOM, ROOMS } from './rooms'
import type { BubbleView } from './requestMap'

export interface ShopRoomsProps {
  /** Id of the avatar of the child (comes back into view when whoever she moves has gone to the street). */
  avatarId: string
  carrier: string | undefined
  bubble: BubbleView | undefined
  bubbleState: AnchorState
  bubbleLabel: string
  onBubble: () => void
}

/** The room where the character the child moves is. Customers outside (the street) are not drawn. */
export function ShopRooms({ avatarId, carrier, bubble, bubbleState, bubbleLabel, onBubble }: ShopRoomsProps) {
  const cast = useCast()
  const mover = cast.state.actors[cast.state.selected]
  const roomId = mover?.room ?? cast.defaultRoom
  const room = ROOMS[roomId]

  // Whoever she was moving went out to the street: she takes over her own character again.
  const { select } = cast
  useEffect(() => {
    if (!room) select(avatarId)
  }, [room, select, avatarId])

  const shown = room ?? ROOMS[ROOM.floor]
  if (!shown) return null
  const isFloor = shown.id === ROOM.floor
  return (
    <Stage key={shown.id} label={shown.label} room={shown.id} floorTop={shown.floorTop} backdrop={shown.backdrop} blocks={shown.blocks} seats={shown.seats} doors={shown.doors} surfaces={shown.surfaces} switcher={false}>
      {isFloor && <Readouts />}
      {isFloor && carrier && bubble && (
        <Anchor
          actorId={carrier}
          state={bubbleState}
          {...(bubble.number !== undefined ? { number: bubble.number } : {})}
          icon={<PropArt id={bubble.icon} size={30} title="" shadow={false} />}
          label={bubbleLabel}
          onActivate={onBubble}
        />
      )}
      <RoomSwitcher />
    </Stage>
  )
}
