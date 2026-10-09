import { useRef, useState, type ReactNode } from 'react'
import { PET_IDS, type PetId } from '../../../characters'
import type { AvatarSpec } from '../../../model/types'
import { DropZone } from '../../../scene/DropZone'
import type { PropInfo } from '../../../scene/SceneContext'
import { FURNITURE_BY_ID } from '../furniture/catalog'
import { CATALOGUE_KIND, itemOfProp } from './Catalogue'
import { dropTarget } from './dropLogic'
import { ROOMS, toLocalX } from './homeLogic'
import { WalkingAvatar, WanderingPet } from './HomeFolk'
import { KitchenFixtures } from './KitchenFixtures'
import { NightSky } from './NightSky'
import { PLACED_KIND, PlacedPiece, uidOfProp } from './PlacedPiece'
import { RoomWalls } from './RoomWalls'
import type { Home } from './useHome'
import { useLastPointer } from './useLastPointer'

export interface RoomStageProps {
  home: Home
  avatar: AvatarSpec
  pets: readonly string[]
  /** Swipe left / right on the floor: next or previous room. */
  onSwipe: (step: 1 | -1) => void
  /** A new piece from the catalogue landed in the room. */
  onPlaced?: () => void
  /** The kitchen's errand (neighbour and worktop) drawn over the room. */
  children?: ReactNode
}

const SWIPE_PX = 70

/** One room of the home: walls, the pieces she placed, her avatar and pet, and the night when she sleeps. */
export function RoomStage({ home, avatar, pets, onSwipe, onPlaced, children }: RoomStageProps) {
  const box = useRef<HTMLDivElement>(null)
  const track = useLastPointer()
  const [walkX, setWalkX] = useState(0.5)
  const press = useRef<{ x: number; y: number } | undefined>(undefined)
  const room = ROOMS.find((r) => r.id === home.room) ?? (ROOMS[0] as (typeof ROOMS)[number])
  const pet = pets.find((p): p is PetId => (PET_IDS as readonly string[]).includes(p))
  const bed = home.here.find((p) => FURNITURE_BY_ID[p.item]?.action === 'bed')

  const onDrop = (prop: PropInfo): void => {
    const el = box.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const base = { room: home.room, rect, track: track.current, now: performance.now(), count: home.here.length }
    if (prop.kind === CATALOGUE_KIND) {
      const id = itemOfProp(prop.id)
      void home.placeNew(id, dropTarget({ ...base, wall: !!FURNITURE_BY_ID[id]?.wall }))
      onPlaced?.()
      return
    }
    const piece = home.pieces.find((p) => p.uid === uidOfProp(prop.id))
    if (piece) home.moveTo(piece.uid, dropTarget({ ...base, moving: piece, wall: !!FURNITURE_BY_ID[piece.item]?.wall }))
  }

  const onFloorUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    const start = press.current
    press.current = undefined
    const el = box.current
    if (!start || !el) return
    const dx = event.clientX - start.x
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
      onSwipe(dx < 0 ? 1 : -1)
      return
    }
    const rect = el.getBoundingClientRect()
    home.select(undefined)
    setWalkX(Math.min(0.94, Math.max(0.06, (event.clientX - rect.left) / rect.width)))
  }

  const name = room.name.charAt(0).toLowerCase() + room.name.slice(1)
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden" style={{ containerType: 'size' }} data-room={home.room}>
      <RoomWalls room={home.room} night={home.night} />
      {home.room === 'cuina' && !children && <KitchenFixtures />}
      <DropZone
        id="habitacio-casa"
        label={name}
        accepts={(p) => p.kind === CATALOGUE_KIND || p.kind === PLACED_KIND}
        onDrop={onDrop}
        className="absolute! inset-0 rounded-none!"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={(e) => (press.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={onFloorUp}
          data-testid="casa-terra"
        />
        {home.here.map((p) => (
          <PlacedPiece key={p.uid} placement={p} selected={home.selected?.uid === p.uid} lit={home.lit.includes(p.uid)} onSelect={home.select} />
        ))}
        <WalkingAvatar spec={avatar} x={walkX} hidden={home.night && bed !== undefined} />
        {pet && <WanderingPet id={pet} night={home.night} />}
      </DropZone>
      {home.night && <NightSky here={home.here} lit={home.lit} bedX={bed ? toLocalX(bed.x) : undefined} bedY={bed?.y} />}
      {children}
    </div>
  )
}
