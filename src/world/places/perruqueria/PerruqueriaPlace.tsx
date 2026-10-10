import { useEffect, useMemo, useState } from 'react'
import { useProgress } from '../../../core/progress/store'
import { NEIGHBOURS_BY_ID } from '../../characters'
import { PropArt } from '../../art/props'
import { useWorld } from '../../data'
import { SandboxErrandPanel } from '../../errands/SandboxErrandPanel'
import { useErrand } from '../../errands/useErrand'
import { useRequests } from '../../requests/useRequests'
import { Anchor } from '../../sandbox/Anchor'
import { CastProvider, useCast } from '../../sandbox/CastContext'
import { ItemsProvider } from '../../sandbox/ItemsContext'
import { Stage } from '../../sandbox/Stage'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import { carrierFor } from '../botiga/shop/requestMap'
import { RoomSwitcher } from '../shared/RoomSwitcher'
import type { PlaceProps } from '../types'
import { ClipArt } from './errands/ClipArt'
import { PERRUQUERIA_ADAPTERS } from './errands/perruqueriaAdapters'
import { BLOCKS, FLOOR_TOP, ROOM, SEATS, STATIONS, STREET_DOOR, SURFACES, TOOL_DEFS, TOOL_START } from './salon/layout'
import { SalonBackdrop } from './salon/SalonBackdrop'
import { SalonMirror } from './salon/SalonMirror'
import { CUSTOMERS, STYLIST, useSalonLife } from './salon/useSalonLife'
import { useRestyle } from './salon/useRestyle'
import { PERRUQUERIA_GAME_ID, PERRUQUERIA_SKILLS } from './perruqueriaSkills'
import { inProgress, mirrorTarget, restyle, stageOf, type Progress } from './styling/styleLogic'
import { wishOf } from './styling/wish'
import '../../sandbox/sandbox.css'

const AVATAR = 'laia'

const baseOf = (id: string) => NEIGHBOURS_BY_ID[id]?.spec

/** The room, the mirror and the wish bubble of the one who asks. Lives inside the cast and the objects. */
function SalonRoom({ look, carrier, wish, state, label, onBubble, progress, setProgress }: { progress: Progress; setProgress: (next: Progress) => void; look: (id: string) => ReturnType<typeof baseOf>; carrier: string | undefined; wish: ReturnType<typeof wishOf>; state: 'waiting' | 'calm' | 'done'; label: string; onBubble: () => void }) {
  const cast = useCast()
  useRestyle(progress, setProgress)
  const [last, setLast] = useState<string | undefined>(undefined)
  const sitters = STATIONS.map((s) => Object.entries(cast.state.actors).find(([, a]) => a.seat === s.seat)?.[0])
  const target = mirrorTarget(sitters.slice(0, 2), last)
  const { select } = cast
  const mover = cast.state.actors[cast.state.selected]
  useEffect(() => {
    if (target) setLast(target)
  }, [target])
  // Whoever she moved went out to the street: she takes her own character back.
  const outside = mover && mover.room !== undefined && mover.room !== ROOM
  useEffect(() => {
    if (outside) select(AVATAR)
  }, [outside, select])
  return (
    <Stage label="El saló" room={ROOM} floorTop={FLOOR_TOP} backdrop={<SalonBackdrop />} blocks={BLOCKS} seats={SEATS} doors={[STREET_DOOR]} surfaces={SURFACES} switcher={false}>
      <SalonMirror look={target ? look(target) : undefined} name={target ? cast.seeds[target]?.name : undefined} />
      {carrier && (
        <Anchor
          actorId={carrier}
          state={state}
          {...(wish.number !== undefined ? { number: wish.number } : {})}
          icon={wish.clips ? <ClipArt size={22} /> : <PropArt id="etiqueta-preu" size={26} title="" shadow={false} />}
          label={label}
          onActivate={onBubble}
        />
      )}
      <RoomSwitcher />
    </Stage>
  )
}

interface WorldProps extends PlaceProps {
  open: boolean
  setOpen: (open: boolean) => void
  progress: Progress
  setProgress: (next: Progress) => void
  forget: (id: string) => void
}

function SalonWorld({ pending, onSolved, onExit, forced, open, setOpen, progress, setProgress, forget }: WorldProps) {
  const errand = useErrand({ gameId: PERRUQUERIA_GAME_ID, skillIds: PERRUQUERIA_SKILLS, adapters: PERRUQUERIA_ADAPTERS, onSolved, ...(forced ? { forced } : {}) })
  const live = useRequests('perruqueria')
  const first = live.requests[0]
  const carrier = first ? carrierFor(first.actorId, first.id, CUSTOMERS) : pending > 0 ? CUSTOMERS[0] : undefined
  useSalonLife({ carrier, keep: inProgress(progress), onLeft: forget })
  const [who, setWho] = useState(carrier)
  if (carrier && carrier !== who) setWho(carrier)
  const name = (carrier && NEIGHBOURS_BY_ID[carrier]?.name) ?? 'una clienta'
  const shown = (who && NEIGHBOURS_BY_ID[who]?.name) ?? name
  const wish = wishOf(errand.item)
  const calm = first?.status === 'calm'
  const bubbleState = errand.phase === 'thanks' ? 'done' : calm ? 'calm' : 'waiting'
  const look = (id: string) => {
    const base = baseOf(id)
    return base ? restyle(base, stageOf(progress, id), CUSTOMERS.indexOf(id as (typeof CUSTOMERS)[number]) + 1) : undefined
  }
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 top-[84px] flex items-center portrait:items-end portrait:pb-[88px]">
        <div className="relative mx-auto h-full max-h-[150vw] w-full">
          <ItemsProvider defs={TOOL_DEFS} start={TOOL_START} floorTop={FLOOR_TOP} onEnter={(door, who) => door.to !== ROOM && who === AVATAR && onExit()}>
            <SalonRoom
              progress={progress}
              setProgress={setProgress}
              look={look}
              carrier={carrier}
              wish={wish}
              state={bubbleState}
              label={`${name} espera${wish.number !== undefined ? ` (${wish.number})` : ''}: toca per atendre`}
              onBubble={() => {
                worldSfx.doorbell()
                if (calm) live.wakeRequests()
                setOpen(true)
              }}
            />
          </ItemsProvider>
        </div>
      </div>
      {open && <SandboxErrandPanel errand={errand} who={shown} label={`Encàrrec a la Perruqueria: ${shown}`} onClose={() => setOpen(false)} />}
    </>
  )
}

/**
 * La Perruqueria, a place to play in: two chairs, a wash basin and a waiting sofa; customers come and sit and
 * can be moved; the tools are carried and used in a chain (wash, comb, cut, colour, dry, clip) while the mirror
 * shows the result. A customer's wish for clips is an ignorable bubble that opens the usual clips errand.
 */
export default function PerruqueriaPlace(props: PlaceProps) {
  const { callSignal, onExit } = props
  const { avatar } = useWorld()
  const profileName = useProgress((s) => s.profile?.name)
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(callSignal)
  const [progress, setProgress] = useState<Progress>({})
  if (seen !== callSignal) {
    setSeen(callSignal)
    setOpen(true)
  }
  const forget = (id: string): void =>
    setProgress((p) => {
      const { [id]: _gone, ...rest } = p
      return rest
    })

  const seeds = useMemo(
    () => [
      { id: AVATAR, kind: 'avatar', name: profileName ? `en ${profileName}` : 'tu', at: { x: 0.3, y: 0.8 }, avatar },
      { id: STYLIST, kind: 'neighbour', name: 'la Núria', at: { x: 0.52, y: 0.8 }, neighbour: STYLIST },
      ...CUSTOMERS.map((id, i) => {
        const base = baseOf(id)
        const spec = base ? restyle(base, stageOf(progress, id), i + 1) : undefined
        return { id, kind: 'avatar' as const, name: NEIGHBOURS_BY_ID[id]?.name ?? 'una clienta', at: { x: 0.5, y: 0.7 }, ...(spec ? { avatar: spec } : {}) }
      }),
    ],
    [avatar, profileName, progress],
  )

  return (
    <Scene label="La Perruqueria" className="h-full min-h-[34rem] w-full">
      <div data-world="dia" className="relative h-full w-full overflow-hidden" style={{ background: '#ffd3e5' }}>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden h-[100px] portrait:block" style={{ background: '#5a566c' }} />
        <h1 className="sr-only">La Perruqueria</h1>
        <CastProvider seeds={seeds} initialSelected={AVATAR} defaultRoom={ROOM}>
          <SalonWorld {...props} open={open} setOpen={setOpen} progress={progress} setProgress={setProgress} forget={forget} />
        </CastProvider>
        <button
          type="button"
          onClick={() => {
            worldSfx.doorClose()
            onExit()
          }}
          className="absolute bottom-3 left-3 z-[4100] flex min-h-16 items-center gap-2 rounded-full bg-white px-5 text-xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)]"
        >
          <span aria-hidden="true">🚪</span>Surt al carrer
        </button>
        <Grain />
      </div>
    </Scene>
  )
}
