import { useMemo, useState } from 'react'
import { useProgress } from '../../../core/progress/store'
import { NEIGHBOURS_BY_ID } from '../../characters'
import { useWorld } from '../../data'
import { SandboxErrandPanel } from '../../errands/SandboxErrandPanel'
import { useErrand } from '../../errands/useErrand'
import { useRequests } from '../../requests/useRequests'
import { CastProvider } from '../../sandbox/CastContext'
import { ItemsProvider } from '../../sandbox/ItemsContext'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import type { DoorDef } from '../../sandbox/types'
import type { PlaceProps } from '../types'
import { BOTIGA_GAME_ID, BOTIGA_SKILLS } from './botigaSkills'
import { BOTIGA_ADAPTERS } from './errands/botigaAdapters'
import { SHOP_DEFS } from './shop/items'
import { bubbleOf, carrierFor } from './shop/requestMap'
import { ROOM, SHOP_START } from './shop/rooms'
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

/** The shop as a living place: rooms, people, things to carry, and the customers' wishes as bubbles. */
function ShopWorld({ pending, onSolved, onExit, forced, open, setOpen }: WorldProps) {
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
  const calm = first?.status === 'calm'
  const state = errand.phase === 'thanks' ? 'done' : calm ? 'calm' : 'waiting'
  const wish = bubble.number === undefined ? '' : ` (${bubble.number})`

  const tapBubble = (): void => {
    worldSfx.doorbell()
    if (calm) live.wakeRequests()
    setOpen(true)
  }

  return (
    <>
      <div className="absolute inset-x-0 bottom-0 top-[84px] flex items-center portrait:items-end portrait:pb-[88px]">
        <div className="relative mx-auto h-full max-h-[150vw] w-full">
          <ItemsProvider
            defs={SHOP_DEFS}
            start={SHOP_START}
            floorTop={0.46}
            onEnter={(door: DoorDef, who: string) => {
              if (door.to === ROOM.street && who === AVATAR) onExit()
            }}
          >
            <ShopRooms avatarId={AVATAR} carrier={carrier} bubble={carrier ? bubble : undefined} bubbleState={state} bubbleLabel={`${name} espera${wish}: toca per atendre`} onBubble={tapBubble} />
          </ItemsProvider>
        </div>
      </div>
      {open && <SandboxErrandPanel errand={errand} who={shown} label={`Encàrrec a la Botiga: ${shown}`} onClose={() => setOpen(false)} />}
    </>
  )
}

/**
 * La Botiga, a place to play in: the shop floor, a back room, the cold room and the loading bay, a
 * shopkeeper, customers who come and go, a cat, a courier. Free play first; the customers' wishes are
 * ignorable bubbles that open the usual errand (basket, change, price tags) when she answers them.
 */
export default function BotigaPlace(props: PlaceProps) {
  const { callSignal, onExit } = props
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
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden h-[100px] portrait:block" style={{ background: '#c98f63' }} />
        <h1 className="sr-only">La Botiga</h1>
        <CastProvider seeds={seeds} initialSelected={AVATAR} defaultRoom={ROOM.floor}>
          <ShopWorld {...props} open={open} setOpen={setOpen} />
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
