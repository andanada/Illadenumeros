import { useState } from 'react'
import { NEIGHBOURS_BY_ID } from '../../characters/neighbours'
import { useErrand } from '../../errands/useErrand'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import type { PlaceProps } from '../types'
import { PERRUQUERIA_ADAPTERS } from './errands/perruqueriaAdapters'
import { CUSTOMER_ID } from './salon/FreePlayChair'
import { SalonBackdrop } from './salon/SalonBackdrop'
import { initialSalon, type SalonState } from './salon/salonLogic'
import { SalonStage } from './salon/SalonStage'
import { useSalonViewport } from './salon/useSalonViewport'
import { PERRUQUERIA_GAME_ID, PERRUQUERIA_SKILLS } from './perruqueriaSkills'

const startSalon = (): SalonState => {
  const hair = NEIGHBOURS_BY_ID[CUSTOMER_ID]?.spec.hair
  return initialSalon(hair?.style ?? 'cabell-curt', hair?.color ?? 'carbo')
}

/**
 * La Perruqueria: free play (tools change the customer's hair, colour and clips) and, when a customer
 * asks for hair clips, the errands: counting on, doubles and near doubles, clips in two groups.
 * Landscape screens fit without scrolling; on a phone the customer and the task come first.
 */
export default function PerruqueriaPlace({ pending, callSignal, onSolved, onExit, forced }: PlaceProps) {
  const [salon, setSalon] = useState<SalonState>(startSalon)
  const [active, setActive] = useState(pending > 0)
  const viewport = useSalonViewport()
  const errand = useErrand({ gameId: PERRUQUERIA_GAME_ID, skillIds: PERRUQUERIA_SKILLS, adapters: PERRUQUERIA_ADAPTERS, onSolved, ...(forced ? { forced } : {}) })

  // The HUD's board rang the bell: a customer comes in (state adjusted during render, no effect needed).
  const [seenSignal, setSeenSignal] = useState(callSignal)
  if (seenSignal !== callSignal) {
    setSeenSignal(callSignal)
    setActive(true)
  }

  const leave = (): void => {
    const solved = errand.phase === 'thanks'
    errand.next()
    if (!solved || pending <= 0) setActive(false)
  }

  const call = (): void => {
    worldSfx.doorbell()
    setActive(true)
  }

  const portrait = viewport.portrait
  return (
    <Scene label="La Perruqueria" className={portrait ? 'min-h-full w-full' : 'h-full min-h-[38rem] w-full'}>
      <div data-world="dia" className={`relative w-full overflow-x-hidden ${portrait ? 'min-h-dvh' : 'h-full'}`}>
        <SalonBackdrop />
        <SalonStage
          errand={{ ...errand, next: leave }}
          active={active}
          pending={pending}
          salon={salon}
          onSalon={setSalon}
          onCall={call}
          viewport={viewport}
          className={`relative ${portrait ? 'min-h-dvh pb-24 pt-[84px]' : 'h-full pb-16 pt-[92px]'}`}
        />
        <button
          type="button"
          onClick={() => {
            worldSfx.doorClose()
            onExit()
          }}
          className="absolute bottom-3 left-3 z-30 flex min-h-16 items-center gap-2 rounded-full bg-white px-5 text-xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)]"
        >
          <span aria-hidden="true">🚪</span>Surt al carrer
        </button>
        <Grain />
      </div>
    </Scene>
  )
}
