import { useState } from 'react'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import { ErrandStage } from '../../errands/ErrandStage'
import { useErrand } from '../../errands/useErrand'
import { BOTIGA_GAME_ID, BOTIGA_SKILLS } from './botigaSkills'
import { BOTIGA_ADAPTERS } from './errands/botigaAdapters'
import { initialShop, type ShopState } from './freePlay'
import { ShopCounter } from './ShopCounter'
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

/** La Botiga de la cantonada: restock, ring up, open the fridge, pet the cat, and serve the neighbours. */
export default function BotigaPlace({ pending, callSignal, onSolved, onExit, forced }: BotigaPlaceProps) {
  const [shop, setShop] = useState<ShopState>(initialShop)
  const [active, setActive] = useState(pending > 0)
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

  return (
    <Scene label="La Botiga" className="min-h-full w-full">
      <div data-world="nit" className="relative min-h-dvh w-full overflow-x-hidden pb-24 pt-24" style={{ background: 'linear-gradient(#FFE9C7, #FFD9A8 60%, #F2C08A)' }}>
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-20" style={{ background: 'repeating-linear-gradient(90deg, #FF6B5B 0 48px, #FBF6EC 48px 96px)' }} />
        <div className="mx-auto grid max-w-6xl gap-4 px-3 lg:grid-cols-[1fr_1.1fr] md:grid-cols-2">
          <section aria-label="Prestatges" className="order-2 md:order-1">
            <ShopShelves shop={shop} onChange={setShop} />
          </section>
          <section aria-label="Taulell" className="order-1 flex flex-col gap-4 md:order-2">
            <div className="min-h-[14rem] rounded-[2rem] bg-white/45 p-3">
              {active ? (
                <ErrandStage errand={{ ...errand, next: leave }} placeName="la Botiga" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-6 text-center">
                  <p className="text-xl font-bold text-[var(--world-ink,#2b2440)]">No hi ha ningú a la cua.</p>
                  <button
                    type="button"
                    onClick={() => {
                      worldSfx.doorbell()
                      setActive(true)
                    }}
                    className="min-h-16 rounded-full bg-[var(--world-coral,#ff6b5b)] px-7 text-2xl font-bold text-white shadow-[var(--world-shadow-lift)]"
                  >
                    <span aria-hidden="true">🔔 </span>Fes passar un veí
                  </button>
                </div>
              )}
            </div>
            <div className="rounded-[2rem] bg-[var(--world-xocolata,#8a5638)]/90 p-3 pt-4">
              <ShopCounter shop={shop} onChange={setShop} />
            </div>
          </section>
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
