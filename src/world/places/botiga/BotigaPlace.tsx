import { useState } from 'react'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import { useErrand } from '../../errands/useErrand'
import { BOTIGA_GAME_ID, BOTIGA_SKILLS } from './botigaSkills'
import { BOTIGA_ADAPTERS } from './errands/botigaAdapters'
import { initialShop, type ShopState } from './freePlay'
import { DeliveryCrate } from './interior/DeliveryCrate'
import { Fridge } from './interior/Fridge'
import { RoomBackdrop } from './interior/RoomBackdrop'
import { ShopStage } from './interior/ShopStage'
import { useShopViewport } from './interior/useShopViewport'
import { ShopShelves } from './ShopShelves'

export interface BotigaPlaceProps {
  /** Errands waiting on the board; when > 0 a neighbour comes in by themselves. */
  pending: number
  /** Bumped by the HUD's errand board: "call a neighbour now". */
  callSignal: number
  onSolved: (coins: number) => void
  onExit: () => void
  /** Tests only: fixed skill. */
  forced?: { skillId: string; factKey?: string }
}

/**
 * La Botiga de la cantonada, as one illustrated room: shelves on the wall, the supplier's crate and the
 * fridge on the floor, and the counter where the neighbours come to ask. Landscape screens fit without
 * scrolling; on a phone the errand comes first and the shelves follow below.
 */
export default function BotigaPlace({ pending, callSignal, onSolved, onExit, forced }: BotigaPlaceProps) {
  const [shop, setShop] = useState<ShopState>(initialShop)
  const [active, setActive] = useState(pending > 0)
  const viewport = useShopViewport()
  const errand = useErrand({ gameId: BOTIGA_GAME_ID, skillIds: BOTIGA_SKILLS, adapters: BOTIGA_ADAPTERS, onSolved, ...(forced ? { forced } : {}) })

  // The HUD's board rang the bell: a neighbour comes in (state adjusted during render, no effect needed).
  const [seenSignal, setSeenSignal] = useState(callSignal)
  if (seenSignal !== callSignal) {
    setSeenSignal(callSignal)
    setActive(true)
  }

  const leave = (): void => {
    const solved = errand.phase === 'thanks'
    errand.next()
    // After a thank-you the next neighbour comes in if the board still has errands; "Ara no" just lets them go.
    if (!solved || pending <= 0) setActive(false)
  }

  const call = (): void => {
    worldSfx.doorbell()
    setActive(true)
  }

  const portrait = viewport.portrait
  return (
    <Scene label="La Botiga" className={portrait ? 'min-h-full w-full' : 'h-full min-h-[38rem] w-full'}>
      <div data-world="nit" className={`relative w-full overflow-x-hidden ${portrait ? 'min-h-dvh' : 'h-full'}`}>
        <RoomBackdrop />
        <div
          className={
            portrait
              ? 'relative flex flex-col gap-4 pb-28 pt-[84px]'
              : 'relative grid h-full grid-cols-[minmax(16rem,31%)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] pt-[92px]'
          }
        >
          <ShopStage
            errand={{ ...errand, next: leave }}
            active={active}
            pending={pending}
            shop={shop}
            onShop={setShop}
            onCall={call}
            viewport={viewport}
            className={portrait ? '' : 'col-start-2 row-span-2 row-start-1 min-h-0'}
          />
          <section aria-label="Prestatges" className={portrait ? 'px-4' : 'col-start-1 row-start-1 min-h-0 px-4 pt-2'}>
            <ShopShelves shop={shop} onChange={setShop} />
          </section>
          <div className={`flex items-end justify-center gap-3 px-4 ${portrait ? '' : 'col-start-1 row-start-2 pb-24'}`}>
            <DeliveryCrate shop={shop} />
            <Fridge shop={shop} onChange={setShop} />
          </div>
        </div>
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
