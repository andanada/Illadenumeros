import { useMemo, useState } from 'react'
import { useProgress } from '../../../core/progress/store'
import { NEIGHBOURS_BY_ID } from '../../characters'
import { useWorld } from '../../data'
import { useErrand } from '../../errands/useErrand'
import { useRequests } from '../../requests/useRequests'
import { CastProvider } from '../../sandbox/CastContext'
import { ItemsProvider } from '../../sandbox/ItemsContext'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import { carrierFor } from '../botiga/shop/requestMap'
import { useBox } from '../shared/doing/useBox'
import { useCustomerLife } from '../shared/doing/useCustomerLife'
import type { PlaceProps } from '../types'
import { FlecaFooter } from './FlecaFooter'
import { FLECA_GAME_ID, FLECA_SKILLS } from './flecaSkills'
import { FLECA_DEFS } from './shop/items'
import { AVATAR, BAKER, CUSTOMERS, LIFE } from './shop/life'
import { FlecaRooms } from './shop/FlecaRooms'
import { FLECA_START, FLOOR_TOP, ROOM } from './shop/rooms'
import { fixedZones, requestZones } from './shop/zones'
import { FLECA_ADAPTERS } from './tasks/flecaAdapters'
import { playOf } from './tasks/flecaTasks'
import '../../sandbox/sandbox.css'

const at = (x: number, y: number) => ({ x, y })

function useSeeds() {
  const { avatar } = useWorld()
  const name = useProgress((s) => s.profile?.name)
  return useMemo(
    () => [
      { id: AVATAR, kind: 'avatar', name: name ? `en ${name}` : 'tu', at: at(0.3, 0.8), avatar },
      { id: BAKER, kind: 'neighbour', name: 'en Pau, el forner', at: at(0.5, 0.78), neighbour: BAKER, loves: ['croissant'] },
      ...CUSTOMERS.map((id, i) => ({ id, kind: 'neighbour' as const, name: NEIGHBOURS_BY_ID[id]?.name ?? 'un veí', at: at(0.5, 0.7 + i * 0.01), neighbour: id })),
    ],
    [avatar, name],
  )
}

interface WorldProps extends PlaceProps {
  open: boolean
  setOpen: (open: boolean) => void
}

/** The bakery as a living place: three rooms, people, things to knead and bake, and the customers' requests as bubbles. */
function FlecaWorld({ pending, onSolved, onExit, forced, open, setOpen }: WorldProps) {
  const errand = useErrand({ gameId: FLECA_GAME_ID, skillIds: FLECA_SKILLS, adapters: FLECA_ADAPTERS, onSolved, ...(forced ? { forced } : {}) })
  const live = useRequests('fleca')
  const first = live.requests[0]
  const carrier = first ? carrierFor(first.actorId, first.id, CUSTOMERS) : pending > 0 ? CUSTOMERS[0] : undefined
  useCustomerLife(LIFE, carrier)
  const [boxRef, box] = useBox()
  const play = playOf(errand.item)
  const itemId = errand.item.id
  const mode = open ? play?.mode : undefined
  const zones = useMemo(() => [...fixedZones(box), ...requestZones(mode, box)], [mode, box, itemId]) // eslint-disable-line react-hooks/exhaustive-deps
  const name = (carrier && NEIGHBOURS_BY_ID[carrier]?.name) ?? 'un veí'
  const calm = first?.status === 'calm'
  const state = errand.phase === 'thanks' ? 'done' : calm ? 'calm' : 'waiting'
  const product = play?.product.id ?? 'magdalena'

  return (
    <ItemsProvider defs={FLECA_DEFS} start={FLECA_START} floorTop={FLOOR_TOP} zones={zones} onEnter={(door, who) => door.to === ROOM.street && who === AVATAR && onExit()}>
      <div className="absolute inset-x-0 bottom-0 top-[84px] flex flex-col portrait:bottom-[88px] portrait:justify-end">
        <div ref={boxRef} className="relative min-h-0 flex-1 portrait:max-h-[150vw]">
          <FlecaRooms
            avatarId={AVATAR}
            carrier={carrier}
            product={product}
            bubbleState={state}
            bubbleLabel={`${name} espera: toca per atendre`}
            onBubble={() => {
              worldSfx.doorbell()
              if (calm) live.wakeRequests()
              setOpen(true)
            }}
          />
        </div>
        <FlecaFooter errand={errand} play={play} open={open} carrier={carrier} onClose={() => setOpen(false)} onExit={onExit} />
      </div>
    </ItemsProvider>
  )
}

/**
 * La Fleca, a place to play in: a shop with its counter and till, a bakehouse with the oven, a flour store. Knead, roll,
 * shape, bake, cool, decorate and box; the customers' requests are ignorable bubbles that you answer by laying rows of
 * muffins on a tray or sharing the bake onto trays.
 */
export default function FlecaPlace(props: PlaceProps) {
  const { callSignal } = props
  const seeds = useSeeds()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(callSignal)
  if (seen !== callSignal) {
    setSeen(callSignal)
    setOpen(true)
  }
  return (
    <Scene label="La Fleca" className="h-full min-h-[34rem] w-full">
      <div data-world="dia" className="relative h-full w-full overflow-hidden" style={{ background: '#ffd0b0' }}>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden h-[88px] portrait:block" style={{ background: '#f2c9a4' }} />
        <h1 className="sr-only">La Fleca</h1>
        <CastProvider seeds={seeds} initialSelected={AVATAR} defaultRoom={ROOM.shop}>
          <FlecaWorld {...props} open={open} setOpen={setOpen} />
        </CastProvider>
        <Grain />
      </div>
    </Scene>
  )
}
