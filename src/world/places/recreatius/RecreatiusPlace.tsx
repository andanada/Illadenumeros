import { useMemo } from 'react'
import { useWorld } from '../../data/useWorld'
import { useErrand } from '../../errands/useErrand'
import { useRequests } from '../../requests/useRequests'
import { CastProvider } from '../../sandbox/CastContext'
import { ItemsProvider } from '../../sandbox/ItemsContext'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import type { PlaceProps } from '../types'
import { ArcadeWorld } from './room/ArcadeWorld'
import { ARCADE_DEFS, ARCADE_ITEMS, ARCADE_ROOM } from './room/items'
import { ARCADE_FLOOR_TOP, arcadeSeeds, CHILD_ID } from './room/layout'
import { RECREATIUS_GAME_ID, RECREATIUS_SKILLS } from './recreatiusSkills'
import '../../sandbox/sandbox.css'

/**
 * Els Recreatius, an arcade you walk through: tap a cabinet (Duel Llampec, Tren de Sumes, Pesca de Sumes) and
 * its screen runs the speed game, play the claw machine and carry the toy it drops to a friend, take a funny photo,
 * toss a puck on the air-hockey table. The warm-up bubble over the Duel and the clerk's prize count are the maths;
 * ignoring them is fine.
 */
export default function RecreatiusPlace({ pending, callSignal, onSolved, onExit, forced }: PlaceProps) {
  const { avatar } = useWorld()
  const seeds = useMemo(() => arcadeSeeds(avatar), [avatar])
  const errand = useErrand({ gameId: RECREATIUS_GAME_ID, skillIds: RECREATIUS_SKILLS, adapters: [], onSolved, ...(forced ? { forced } : {}) })
  const { requests } = useRequests('recreatius')
  return (
    <Scene label="Els Recreatius" className="h-full min-h-dvh w-full">
      <CastProvider seeds={seeds} initialSelected={CHILD_ID} defaultRoom={ARCADE_ROOM}>
        <ItemsProvider
          defs={ARCADE_DEFS}
          start={ARCADE_ITEMS}
          floorTop={ARCADE_FLOOR_TOP}
          onEnter={(door, who) => {
            if (door.to === 'carrer' && who === CHILD_ID) onExit()
          }}
        >
          <ArcadeWorld errand={errand} requests={requests} pending={pending} callSignal={callSignal} onSolved={onSolved} onExit={onExit} />
        </ItemsProvider>
      </CastProvider>
      <Grain />
    </Scene>
  )
}
