import { useMemo, useState } from 'react'
import type { ZoneDef } from '../../sandbox/zoneTypes'
import { useProgress } from '../../../core/progress/store'
import { NEIGHBOURS_BY_ID } from '../../characters'
import { useWorld } from '../../data'
import { SandboxErrandPanel } from '../../errands/SandboxErrandPanel'
import { useErrand } from '../../errands/useErrand'
import { useRequests } from '../../requests/useRequests'
import { CastProvider, useCast } from '../../sandbox/CastContext'
import { ItemsProvider } from '../../sandbox/ItemsContext'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import type { DoorDef } from '../../sandbox/types'
import { useCompactStage } from '../shared/doing/useCompactStage'
import type { PlaceProps } from '../types'
import { BOTIGA_GAME_ID, BOTIGA_SKILLS } from './botigaSkills'
import { basketZones } from './basket/basketSpec'
import { changeZone } from './change/changeSpec'
import { BOTIGA_ADAPTERS } from './errands/botigaAdapters'
import { botigaModeOf } from './errands/botigaMode'
import { SHOP_DEFS } from './shop/items'
import { RequestProps } from './shop/RequestProps'
import { bubbleOf, carrierFor } from './shop/requestMap'
import { ROOM, SHOP_START } from './shop/rooms'
import { ShopFooter } from './shop/ShopFooter'
import { ShopRooms } from './shop/ShopRooms'
import { CAT, COURIER, CUSTOMERS, KEEPER, useShopLife } from './shop/useShopLife'
import '../../sandbox/sandbox.css'

const AVATAR = 'laia'
const at = (x: number, y: number) => ({ x, y })

function useSeeds() {
  const { avatar } = useWorld()
  const name = useProgress((s) => s.profile?.name)
  return useMemo(
    () => [
      { id: AVATAR, kind: 'avatar', name: name ? `en ${name}` : 'tu', at: at(0.3, 0.8), avatar },
      { id: KEEPER, kind: 'neighbour', name: 'la Senyora Pilar', at: at(0.7, 0.5), neighbour: KEEPER, facing: -1, loves: ['poma'] },
      ...CUSTOMERS.map((id, i) => ({ id, kind: 'neighbour' as const, name: NEIGHBOURS_BY_ID[id]?.name ?? 'un veí', at: at(0.5, 0.7 + i * 0.01), neighbour: id })),
      { id: COURIER, kind: 'neighbour', name: 'el repartidor', at: at(0.62, 0.8), neighbour: 'repartidor' },
      { id: CAT, kind: 'pet', name: 'la gata Mixa', at: at(0.69, 0.54), pet: 'mixa' },
    ],
    [avatar, name],
  )
}

interface WorldProps extends PlaceProps {
  open: boolean
  setOpen: (open: boolean) => void
}

const NO_ZONES: readonly ZoneDef[] = []

/** The shop as a living place: rooms, people, things to carry, and the customers' wishes as bubbles. */
function ShopWorld({ pending, onSolved, onExit, forced, open, setOpen }: WorldProps) {
  const cast = useCast()
  const compact = useCompactStage()
  const errand = useErrand({ gameId: BOTIGA_GAME_ID, skillIds: BOTIGA_SKILLS, adapters: BOTIGA_ADAPTERS, onSolved, ...(forced ? { forced } : {}) })
  const live = useRequests('botiga')
  const first = live.requests[0]
  const carrier = first ? carrierFor(first.actorId, first.id, CUSTOMERS) : pending > 0 ? CUSTOMERS[0] : undefined
  useShopLife(carrier)
  const [who, setWho] = useState(carrier)
  if (carrier && carrier !== who) setWho(carrier)
  const name = (carrier && NEIGHBOURS_BY_ID[carrier]?.name) ?? 'un veí'
  const shown = (who && NEIGHBOURS_BY_ID[who]?.name) ?? name
  const bubble = bubbleOf(errand.item)
  const mode = useMemo(() => botigaModeOf(errand.item), [errand.item])
  const calm = first?.status === 'calm'
  const state = errand.phase === 'thanks' ? 'done' : calm ? 'calm' : 'waiting'
  const wish = bubble.number === undefined ? '' : ` (${bubble.number})`

  const zones = useMemo(() => {
    if (!open) return NO_ZONES
    if (mode.kind === 'basket') return basketZones(mode.task, compact)
    return mode.kind === 'change' ? [changeZone(mode.task, compact)] : NO_ZONES
  }, [open, mode, compact])

  const tapBubble = (): void => {
    worldSfx.doorbell()
    if (calm) live.wakeRequests()
    // The goods and the till are on the shop floor: she comes there, and the customer is already at the counter.
    if (mode.kind !== 'sheet' && (cast.state.actors[AVATAR]?.room ?? cast.defaultRoom) !== ROOM.floor) cast.enterRoom(AVATAR, ROOM.floor, { x: 0.3, y: 0.8 })
    if (mode.kind !== 'sheet') cast.select(AVATAR)
    setOpen(true)
  }
  const close = (): void => setOpen(false)

  return (
    <>
      <ItemsProvider
        defs={SHOP_DEFS}
        start={SHOP_START}
        floorTop={0.46}
        zones={zones}
        onEnter={(door: DoorDef, who: string) => {
          if (door.to === ROOM.street && who === AVATAR) onExit()
        }}
      >
        <div className="absolute inset-x-0 bottom-0 top-[84px] flex flex-col portrait:bottom-[88px] portrait:justify-end">
          <div className="relative min-h-0 flex-1 portrait:max-h-[150vw]">
            <ShopRooms
              avatarId={AVATAR}
              carrier={carrier}
              bubble={carrier ? bubble : undefined}
              bubbleState={state}
              bubbleLabel={`${name} espera${wish}: toca per atendre`}
              onBubble={tapBubble}
              extras={open ? <RequestProps mode={mode} compact={compact} /> : undefined}
            />
          </div>
          <ShopFooter errand={errand} mode={mode} open={open} carrier={carrier} compact={compact} onClose={close} onExit={onExit} />
        </div>
      </ItemsProvider>
      {open && mode.kind === 'sheet' && <SandboxErrandPanel errand={errand} who={shown} label={`Encàrrec a la Botiga: ${shown}`} onClose={() => setOpen(false)} />}
    </>
  )
}

/**
 * La Botiga, a place to play in: the shop floor, a back room, the cold room and the loading bay, a
 * shopkeeper, customers who come and go, a cat, a courier. Free play first; the customers' wishes are
 * ignorable bubbles that open the usual errand (basket, change, price tags) when she answers them.
 */
export default function BotigaPlace(props: PlaceProps) {
  const { callSignal } = props
  const seeds = useSeeds()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(callSignal)
  if (seen !== callSignal) {
    setSeen(callSignal)
    setOpen(true)
  }
  return (
    <Scene label="La Botiga" className="h-full min-h-[34rem] w-full">
      <div data-world="nit" className="relative h-full w-full overflow-hidden" style={{ background: '#ffd9a0' }}>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden h-[88px] portrait:block" style={{ background: '#c98f63' }} />
        <h1 className="sr-only">La Botiga</h1>
        <CastProvider seeds={seeds} initialSelected={AVATAR} defaultRoom={ROOM.floor}>
          <ShopWorld {...props} open={open} setOpen={setOpen} />
        </CastProvider>
        <Grain />
      </div>
    </Scene>
  )
}
