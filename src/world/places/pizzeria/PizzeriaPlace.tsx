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
import { PizzeriaFooter } from './PizzeriaFooter'
import { PIZZERIA_GAME_ID, PIZZERIA_SKILLS } from './pizzeriaSkills'
import { PIZZERIA_DEFS } from './shop/items'
import { AVATAR, COOK, CUSTOMERS, LIFE, WAITER } from './shop/life'
import { PizzeriaRooms } from './shop/PizzeriaRooms'
import { FLOOR_TOP, PIZZERIA_START, ROOM } from './shop/rooms'
import { fixedZones, requestZones } from './shop/zones'
import { PIZZERIA_ADAPTERS } from './tasks/pizzeriaAdapters'
import { playOf } from './tasks/pizzeriaTasks'
import '../../sandbox/sandbox.css'

const at = (x: number, y: number) => ({ x, y })

function useSeeds() {
  const { avatar } = useWorld()
  const name = useProgress((s) => s.profile?.name)
  return useMemo(
    () => [
      { id: AVATAR, kind: 'avatar', name: name ? `en ${name}` : 'tu', at: at(0.3, 0.84), avatar },
      { id: COOK, kind: 'neighbour', name: 'en Jordi, el pizzer', at: at(0.5, 0.8), neighbour: COOK, loves: ['tros'] },
      { id: WAITER, kind: 'neighbour', name: 'la Marta, la cambrera', at: at(0.5, 0.66), neighbour: 'marta-cambrera' },
      ...CUSTOMERS.map((id, i) => ({ id, kind: 'neighbour' as const, name: NEIGHBOURS_BY_ID[id]?.name ?? 'un veí', at: at(0.5, 0.7 + i * 0.01), neighbour: id })),
    ],
    [avatar, name],
  )
}

interface WorldProps extends PlaceProps {
  open: boolean
  setOpen: (open: boolean) => void
}

/** The pizzeria as a living place: kitchen, dining room and the terrace with the scooter; requests as bubbles. */
function PizzeriaWorld({ pending, onSolved, onExit, forced, open, setOpen }: WorldProps) {
  const errand = useErrand({ gameId: PIZZERIA_GAME_ID, skillIds: PIZZERIA_SKILLS, adapters: PIZZERIA_ADAPTERS, onSolved, ...(forced ? { forced } : {}) })
  const live = useRequests('pizzeria')
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

  return (
    <ItemsProvider defs={PIZZERIA_DEFS} start={PIZZERIA_START} floorTop={FLOOR_TOP} zones={zones} onEnter={(door, who) => door.to === ROOM.street && who === AVATAR && onExit()}>
      <div className="absolute inset-x-0 bottom-0 top-[84px] flex flex-col portrait:bottom-[88px] portrait:justify-end">
        <div ref={boxRef} className="relative min-h-0 flex-1 portrait:max-h-[150vw]">
          <PizzeriaRooms
            avatarId={AVATAR}
            carrier={carrier}
            bubbleState={state}
            bubbleLabel={`${name} espera: toca per atendre`}
            onBubble={() => {
              worldSfx.doorbell()
              if (calm) live.wakeRequests()
              setOpen(true)
            }}
          />
        </div>
        <PizzeriaFooter errand={errand} play={play} open={open} carrier={carrier} onClose={() => setOpen(false)} onExit={onExit} />
      </div>
    </ItemsProvider>
  )
}

/**
 * La Pizzeria, a place to play in: a kitchen with the oven, a dining room, a terrace with the delivery scooter. Roll,
 * sauce, top, bake, slice and serve; the customers' requests are ignorable bubbles that you answer by sharing slices
 * onto plates, by cutting a pizza into equal parts and handing some over, or with the price tags.
 */
export default function PizzeriaPlace(props: PlaceProps) {
  const { callSignal } = props
  const seeds = useSeeds()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(callSignal)
  if (seen !== callSignal) {
    setSeen(callSignal)
    setOpen(true)
  }
  return (
    <Scene label="La Pizzeria" className="h-full min-h-[34rem] w-full">
      <div data-world="dia" className="relative h-full w-full overflow-hidden" style={{ background: '#ffd6b8' }}>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden h-[88px] portrait:block" style={{ background: '#e8b9a0' }} />
        <h1 className="sr-only">La Pizzeria</h1>
        <CastProvider seeds={seeds} initialSelected={AVATAR} defaultRoom={ROOM.dining}>
          <PizzeriaWorld {...props} open={open} setOpen={setOpen} />
        </CastProvider>
        <Grain />
      </div>
    </Scene>
  )
}
