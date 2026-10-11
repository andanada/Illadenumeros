import { useMemo, useState } from 'react'
import type { ZoneDef } from '../../sandbox/zoneTypes'
import { useWorld } from '../../data/useWorld'
import { useErrand } from '../../errands/useErrand'
import { useRequests } from '../../requests/useRequests'
import { CastProvider } from '../../sandbox/CastContext'
import { ItemsProvider } from '../../sandbox/ItemsContext'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import type { PlaceProps } from '../types'
import { useCompactStage } from '../shared/doing/useCompactStage'
import { prizeModeOf, RECREATIUS_ADAPTERS } from './prizes/prizeMode'
import { prizeZones } from './prizes/prizeSpec'
import { ArcadeWorld } from './room/ArcadeWorld'
import { ARCADE_DEFS, ARCADE_ITEMS, ARCADE_ROOM } from './room/items'
import { ARCADE_FLOOR_TOP, arcadeSeeds, CHILD_ID } from './room/layout'
import { RECREATIUS_GAME_ID, RECREATIUS_SKILLS } from './recreatiusSkills'
import '../../sandbox/sandbox.css'

const NO_ZONES: readonly ZoneDef[] = []

/**
 * Els Recreatius, an arcade you walk through: tap a cabinet (Duel Llampec, Tren de Sumes, Pesca de Sumes) and
 * its screen runs the speed game, play the claw machine and carry the toy it drops to a friend, take a funny photo,
 * toss a puck on the air-hockey table. The warm-up bubble over the Duel and the clerk's prize count (toys from the counter
 * shelf onto the clerk's tray) are the maths; ignoring them is fine.
 */
export default function RecreatiusPlace({ pending, callSignal, onSolved, onExit, forced }: PlaceProps) {
  const { avatar } = useWorld()
  const seeds = useMemo(() => arcadeSeeds(avatar), [avatar])
  const errand = useErrand({ gameId: RECREATIUS_GAME_ID, skillIds: RECREATIUS_SKILLS, adapters: RECREATIUS_ADAPTERS, onSolved, ...(forced ? { forced } : {}) })
  const { requests } = useRequests('recreatius')
  const compact = useCompactStage()
  const [clerkOpen, setClerkOpen] = useState(false)
  const prize = useMemo(() => prizeModeOf(errand.item), [errand.item])
  const zones = useMemo(() => (clerkOpen && prize ? prizeZones(prize, compact) : NO_ZONES), [clerkOpen, prize, compact])
  return (
    <Scene label="Els Recreatius" className="h-full min-h-dvh w-full">
      <CastProvider seeds={seeds} initialSelected={CHILD_ID} defaultRoom={ARCADE_ROOM}>
        <ItemsProvider
          defs={ARCADE_DEFS}
          start={ARCADE_ITEMS}
          floorTop={ARCADE_FLOOR_TOP}
          zones={zones}
          onEnter={(door, who) => {
            if (door.to === 'carrer' && who === CHILD_ID) onExit()
          }}
        >
          <ArcadeWorld clerkOpen={clerkOpen} setClerkOpen={setClerkOpen} prize={prize} errand={errand} requests={requests} pending={pending} callSignal={callSignal} onSolved={onSolved} onExit={onExit} />
        </ItemsProvider>
      </CastProvider>
      <Grain />
    </Scene>
  )
}
