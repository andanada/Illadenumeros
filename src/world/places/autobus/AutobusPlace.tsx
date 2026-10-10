import { useMemo } from 'react'
import { useWorld } from '../../data/useWorld'
import { useErrand } from '../../errands/useErrand'
import { useRequests } from '../../requests/useRequests'
import { CastProvider } from '../../sandbox/CastContext'
import { ItemsProvider } from '../../sandbox/ItemsContext'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import type { PlaceProps } from '../types'
import { AUTOBUS_GAME_ID, AUTOBUS_SKILLS } from './autobusSkills'
import { AUTOBUS_ADAPTERS } from './errands/autobusAdapters'
import { BUS_FLOOR_TOP } from './world/busLayout'
import { BusWorld } from './world/BusWorld'
import { busSeeds } from './world/cast'
import { BUS_DEFS, BUS_ITEMS } from './world/items'
import { BUS_ROOM } from './world/riders'
import '../../sandbox/sandbox.css'

/**
 * L’Autobús, a bus you can walk through: sit, hold the pole, press the stop button, put a case on the rack, toss a
 * ball in the aisle, feed the pet. A driver you can choose drives it along the numbered stops; at each stop people
 * get on and off by walking through the door and you can step off and look around. The small needs of the
 * passengers (bubbles) are the maths: move people on and off, or drive so many stops. Ignoring them is fine.
 */
export default function AutobusPlace({ pending, callSignal, onSolved, onExit, forced }: PlaceProps) {
  const { avatar } = useWorld()
  const seeds = useMemo(() => busSeeds(avatar), [avatar])
  const errand = useErrand({ gameId: AUTOBUS_GAME_ID, skillIds: AUTOBUS_SKILLS, adapters: AUTOBUS_ADAPTERS, onSolved, ...(forced ? { forced } : {}) })
  const { requests } = useRequests('autobus')
  return (
    <Scene label="L’Autobús" className="h-full min-h-dvh w-full">
      <CastProvider seeds={seeds} initialSelected="laia" defaultRoom={BUS_ROOM}>
        <ItemsProvider defs={BUS_DEFS} start={BUS_ITEMS} floorTop={BUS_FLOOR_TOP}>
          <BusWorld errand={errand} requests={requests} pending={pending} callSignal={callSignal} onExit={onExit} />
        </ItemsProvider>
      </CastProvider>
      <Grain />
    </Scene>
  )
}
