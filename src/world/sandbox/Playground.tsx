import { useMemo, useState } from 'react'
import { defaultAvatar } from '../characters'
import { Anchor, type AnchorState } from './Anchor'
import { CastProvider, useCast } from './CastContext'
import { ItemsProvider, type StartItem } from './ItemsContext'
import { PLAY_DEFS } from './playItems'
import { PLAY_ROOMS } from './playRooms'
import { Stage } from './Stage'
import './sandbox.css'

const SEEDS = [
  { id: 'laia', kind: 'avatar', name: 'la Laia', at: { x: 0.45, y: 0.84 }, avatar: defaultAvatar('nyx', 'rosa') },
  { id: 'pilar', kind: 'neighbour', name: 'la Pilar', at: { x: 0.8, y: 0.82 }, neighbour: 'senyora-pilar', facing: -1, loves: ['poma'] },
  { id: 'nyx', kind: 'pet', name: 'la Nyx', at: { x: 0.36, y: 0.88 }, pet: 'nyx', follow: 'laia' },
] as const

const START: readonly StartItem[] = [
  { uid: 'nevera', def: 'nevera', room: 'sala', at: { x: 0.59, y: 0.62 } },
  { uid: 'poma', def: 'poma', room: 'sala', at: { x: 0, y: 0 }, inside: 'nevera' },
  { uid: 'esponja', def: 'esponja', room: 'sala', at: { x: 0.46, y: 0.8 } },
  { uid: 'ganivet', def: 'ganivet', room: 'sala', at: { x: 0.56, y: 0.9 } },
  { uid: 'olla', def: 'olla', room: 'sala', at: { x: 0.31, y: 0.82 } },
  { uid: 'plat', def: 'plat', room: 'sala', at: { x: 0.19, y: 0.9 } },
  { uid: 'ou', def: 'ou', room: 'sala', at: { x: 0.94, y: 0.9 } },
  { uid: 'pilota', def: 'pilota', room: 'jardi', at: { x: 0.45, y: 0.82 } },
  { uid: 'pilota-2', def: 'pilota', room: 'sala', at: { x: 0.1, y: 0.74 } },
]

function Rooms() {
  const cast = useCast()
  const [request, setRequest] = useState<AnchorState>('waiting')
  const mover = cast.state.actors[cast.state.selected]
  const room = PLAY_ROOMS[mover?.room ?? cast.defaultRoom] ?? PLAY_ROOMS.sala
  if (!room) return null
  return (
    <Stage key={room.id} label={room.label} room={room.id} floorTop={room.floorTop} backdrop={room.backdrop} blocks={room.blocks} seats={room.seats} doors={room.doors} surfaces={room.surfaces}>
      {room.id === 'sala' && (
        <Anchor
          actorId="pilar"
          state={request}
          number={3}
          icon={<span className="block size-6 rounded-full bg-[var(--world-coral,#ff6b5b)]" />}
          label={request === 'done' ? 'La Pilar està contenta' : 'La Pilar vol 3 pomes'}
          onActivate={() => setRequest(request === 'done' ? 'waiting' : 'done')}
        />
      )}
    </Stage>
  )
}

/**
 * Demo room for the sandbox primitives (and the e2e): three actors, a fridge with fruit, tools, a
 * surprise egg, a ball, a sofa, a table and a door to a garden. Mount it on any dev route.
 */
export function Playground() {
  const seeds = useMemo(() => SEEDS.map((s) => ({ ...s })), [])
  const start = useMemo(() => START, [])
  return (
    <div data-testid="playground" className="relative h-dvh w-full overflow-hidden bg-[#2b2440] font-display">
      <h1 className="sr-only">Laboratori de joc</h1>
      <CastProvider seeds={seeds} initialSelected="laia" defaultRoom="sala">
        <ItemsProvider defs={PLAY_DEFS} start={start} floorTop={0.47}>
          <div className="absolute inset-x-0 top-1/2 mx-auto h-full -translate-y-1/2 overflow-hidden" style={{ maxHeight: '115vw' }}>
            <Rooms />
          </div>
        </ItemsProvider>
      </CastProvider>
    </div>
  )
}
