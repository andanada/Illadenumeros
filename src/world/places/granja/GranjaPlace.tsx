import { useMemo, useState } from 'react'
import { useProgress } from '../../../core/progress/store'
import { useWorld } from '../../data'
import { SandboxErrandPanel } from '../../errands/SandboxErrandPanel'
import { useErrand } from '../../errands/useErrand'
import { NEIGHBOURS_BY_ID } from '../../characters'
import { useRequests } from '../../requests/useRequests'
import { CastProvider, useCast } from '../../sandbox/CastContext'
import { ItemsProvider } from '../../sandbox/ItemsContext'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import type { DoorDef } from '../../sandbox/types'
import type { PlaceProps } from '../types'
import { GRANJA_ADAPTERS, farmModeOf } from './errands/granjaAdapters'
import { GRANJA_GAME_ID, GRANJA_SKILLS } from './granjaSkills'
import { AVATAR, carrierFor, farmSeeds, FARMER } from './farm/cast'
import { FarmRooms } from './farm/FarmRooms'
import { PlantCard, ShareCard } from './farm/FarmTask'
import { EggArt, GrainArt, Mini, SeedArt } from './farm/itemArt'
import { FARM_DEFS } from './farm/items'
import { FARM_START, FARM_ZONES, ROOM } from './farm/rooms'
import { useFarmLife } from './farm/useFarmLife'
import { plotZone } from './garden/plantLogic'
import { shareZones } from './share/shareLayout'
import '../../sandbox/sandbox.css'

interface WorldProps extends PlaceProps {
  open: boolean
  setOpen: (open: boolean) => void
}

const exitClass = 'absolute bottom-3 left-3 z-[4100] flex min-h-16 items-center gap-2 rounded-full bg-white px-5 text-xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)]'

/** The farm as a living place: two parts, people and animals, things to carry, and the requests as bubbles. */
function FarmWorld({ pending, onSolved, onExit, forced, open, setOpen }: WorldProps) {
  const cast = useCast()
  const errand = useErrand({ gameId: GRANJA_GAME_ID, skillIds: GRANJA_SKILLS, adapters: GRANJA_ADAPTERS, onSolved, ...(forced ? { forced } : {}) })
  const live = useRequests('granja')
  const first = live.requests[0]
  const carrier = first ? carrierFor(first.actorId, first.id) : pending > 0 || forced ? FARMER : undefined
  useFarmLife(open)
  const mode = farmModeOf(errand.item)
  const name = (carrier && NEIGHBOURS_BY_ID[carrier]?.name) ?? 'un veí'
  const calm = first?.status === 'calm'
  const state = errand.phase === 'thanks' ? 'done' : calm ? 'calm' : 'waiting'
  const number = mode.kind === 'sheet' ? undefined : mode.task.total

  const zones = useMemo(() => {
    if (!open) return FARM_ZONES
    if (mode.kind === 'plant') return [...FARM_ZONES, plotZone(mode.task, ROOM.hort)]
    return mode.kind === 'share' ? [...FARM_ZONES, ...shareZones(mode.task, ROOM.hort)] : FARM_ZONES
  }, [open, mode])

  const tapBubble = (): void => {
    worldSfx.doorbell()
    if (calm) live.wakeRequests()
    if (mode.kind !== 'sheet') {
      // The plot is in the garden: she and whoever asks go there.
      cast.enterRoom(AVATAR, ROOM.hort, { x: 0.22, y: 0.7 })
      if (carrier) cast.enterRoom(carrier, ROOM.hort, { x: 0.1, y: 0.62 })
      cast.select(AVATAR)
    }
    setOpen(true)
  }
  const close = (): void => {
    if (errand.phase === 'thanks' || errand.phase === 'shown') errand.next()
    setOpen(false)
  }
  const icon = mode.kind === 'share' ? mode.task.mode === 'groups' ? <EggArt /> : <GrainArt /> : <SeedArt />
  const wish = number === undefined ? '' : ` (${number})`

  return (
    <>
      <div className="absolute inset-x-0 bottom-0 top-[84px] flex flex-col portrait:pb-[88px]">
        <ItemsProvider
          defs={FARM_DEFS}
          start={FARM_START}
          floorTop={0.44}
          zones={zones}
          onEnter={(door: DoorDef, who: string) => {
            if (door.to === ROOM.street && who === AVATAR) onExit()
          }}
        >
          <div className="relative mx-auto min-h-0 w-full max-h-[150vw] flex-1">
            <FarmRooms
              avatarId={AVATAR}
              carrier={carrier}
              bubbleIcon={<Mini>{icon}</Mini>}
              bubbleNumber={number}
              bubbleState={state}
              bubbleLabel={`${name} espera${wish}: toca per ajudar`}
              onBubble={tapBubble}
            />
          </div>
          {open && mode.kind === 'plant' && (
            <div className="max-h-[42%] shrink-0 overflow-y-auto px-2 pb-2 landscape:pl-[236px]">
              <PlantCard errand={errand} task={mode.task} onClose={close} />
            </div>
          )}
          {open && mode.kind === 'share' && (
            <div className="max-h-[42%] shrink-0 overflow-y-auto px-2 pb-2 landscape:pl-[236px]">
              <ShareCard errand={errand} task={mode.task} onClose={close} />
            </div>
          )}
        </ItemsProvider>
      </div>
      {open && mode.kind === 'sheet' && <SandboxErrandPanel errand={errand} who={name} label={`Encàrrec a la Granja: ${name}`} onClose={close} />}
    </>
  )
}

/**
 * La Granja, a place to play in: a kitchen garden to sow, water and harvest, a farmyard with a barn, a hen house,
 * a pond and a tractor; the farmer, neighbours and pets to move. Maths hangs in ignorable bubbles: rows of seeds
 * (multiplying), feed shared among the animals and eggs in boxes (dividing, with «en sobren»).
 */
export default function GranjaPlace(props: PlaceProps) {
  const { callSignal, onExit } = props
  const { avatar } = useWorld()
  const name = useProgress((s) => s.profile?.name)
  const seeds = useMemo(() => farmSeeds(avatar, name), [avatar, name])
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(callSignal)
  if (seen !== callSignal) {
    setSeen(callSignal)
    setOpen(true)
  }
  return (
    <Scene label="La Granja" className="h-full min-h-[34rem] w-full">
      <div data-world="dia" className="relative h-full w-full overflow-hidden" style={{ background: 'linear-gradient(#bfe6ff 0 90px, #a5cc47 90px)' }}>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden h-[100px] portrait:block" style={{ background: '#7fa92b' }} />
        <h1 className="sr-only">La Granja</h1>
        <CastProvider seeds={seeds} initialSelected={AVATAR} defaultRoom={ROOM.hort}>
          <FarmWorld {...props} open={open} setOpen={setOpen} />
        </CastProvider>
        <button
          type="button"
          onClick={() => {
            worldSfx.doorClose()
            onExit()
          }}
          className={exitClass}
        >
          <span aria-hidden="true">🚪</span>Surt al carrer
        </button>
        <Grain />
      </div>
    </Scene>
  )
}
