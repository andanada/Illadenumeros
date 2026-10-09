import { useState } from 'react'
import { useWorld } from '../../data'
import { useErrand } from '../../errands/useErrand'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import type { PlaceProps } from '../types'
import { CASA_GAME_ID, CASA_SKILLS } from './casaSkills'
import { FURNITURE_BY_ID, registerCasaCatalog } from './furniture/catalog'
import { Catalogue } from './home/Catalogue'
import { defaultSpot, ROOMS } from './home/homeLogic'
import { PieceToolbar } from './home/PieceToolbar'
import { RoomStage } from './home/RoomStage'
import { RoomTabs } from './home/RoomTabs'
import { useHome } from './home/useHome'
import { CASA_ADAPTERS } from './kitchen/casaAdapters'
import { KitchenErrand, useKitchenViewport } from './kitchen/KitchenErrand'

registerCasaCatalog()

const round = 'flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-white px-4 text-xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)] active:translate-y-0.5'

/**
 * La Casa: her home, three rooms to swipe between (sala, habitació, cuina). Free play: buy furniture with
 * coins, place it anywhere, move / flip / recolour / put it away, switch lamps on, sleep in the bed, and her
 * pet wanders around. In the kitchen a neighbour comes to cook: the recipe errands (facts around ten).
 */
export default function CasaPlace({ pending, callSignal, onSolved, onExit, forced }: PlaceProps) {
  const { avatar, pets } = useWorld()
  const home = useHome(pending > 0 ? 'cuina' : 'sala')
  const [active, setActive] = useState(pending > 0)
  const [shopping, setShopping] = useState(false)
  const viewport = useKitchenViewport()
  const errand = useErrand({ gameId: CASA_GAME_ID, skillIds: CASA_SKILLS, adapters: CASA_ADAPTERS, onSolved, ...(forced ? { forced } : {}) })

  // The HUD's board rang: a neighbour comes into the kitchen (state adjusted during render).
  const [seenSignal, setSeenSignal] = useState(callSignal)
  if (seenSignal !== callSignal) {
    setSeenSignal(callSignal)
    setActive(true)
    if (home.room !== 'cuina') home.setRoom('cuina', true)
  }

  const leave = (): void => {
    const solved = errand.phase === 'thanks'
    errand.next()
    if (!solved || pending <= 0) setActive(false)
  }

  const call = (): void => {
    worldSfx.doorbell()
    home.setNight(false)
    setActive(true)
  }

  const step = (dir: 1 | -1): void => {
    const i = ROOMS.findIndex((r) => r.id === home.room)
    const next = ROOMS[(i + dir + ROOMS.length) % ROOMS.length]
    if (next) home.setRoom(next.id)
  }

  const placeFromCatalogue = (id: string): void => {
    const def = FURNITURE_BY_ID[id]
    void home.placeNew(id, defaultSpot(home.room, home.here.length, !!def?.wall))
    setShopping(false)
  }

  const exitButton = (
    <button
      type="button"
      aria-label="Surt al carrer"
      onClick={() => {
        worldSfx.doorClose()
        onExit()
      }}
      className={round}
    >
      <span aria-hidden="true">🚪</span>
      <span aria-hidden="true" className="hidden md:inline">
        Surt al carrer
      </span>
    </button>
  )
  const tabs = <RoomTabs room={home.room} onRoom={home.setRoom} busyKitchen={active} />
  const sideButton =
    home.room === 'cuina' && !active ? (
      <button type="button" onClick={call} aria-label="Qui vol cuinar? Fes passar un veí" className={`${round} bg-[var(--world-coral,#ff6b5b)] text-white`}>
        <span aria-hidden="true">🔔</span>
        <span aria-hidden="true" className="hidden md:inline">
          Cuinem!
        </span>
      </button>
    ) : (
      <button type="button" onClick={() => setShopping(true)} aria-label="Mobles" className={round}>
        <span aria-hidden="true">🛋️</span>
        <span aria-hidden="true" className="hidden md:inline">
          Mobles
        </span>
      </button>
    )

  const cooking = active && home.room === 'cuina'
  const selected = home.selected
  return (
    <Scene label="La Casa" className="h-full min-h-[30rem] w-full">
      <div data-world={home.night ? 'nit' : 'dia'} className="relative h-full min-h-[30rem] w-full overflow-hidden">
        <RoomStage home={home} avatar={avatar} pets={pets} onSwipe={step} onPlaced={() => setShopping(false)}>
          {cooking && <KitchenErrand errand={{ ...errand, next: leave }} pending={pending} viewport={viewport} />}
        </RoomStage>

        <p role="status" aria-live="polite" className="sr-only">
          {home.night ? 'És de nit: dorms al llit. Zzz…' : ''}
        </p>

        {selected && !cooking && !home.night && (
          <div className="pointer-events-none absolute inset-x-2 top-[96px] z-[700] flex justify-center">
            <PieceToolbar
              piece={selected}
              lit={home.lit.includes(selected.uid)}
              onNudge={home.nudgeSelected}
              onFlip={home.flipSelected}
              onColour={home.recolourSelected}
              onAction={() => {
                const def = FURNITURE_BY_ID[selected.item]
                if (def?.action === 'bed') {
                  worldSfx.purr()
                  home.select(undefined)
                  home.setNight(true)
                } else home.toggleLamp(selected.uid)
              }}
              onStore={home.storeSelected}
              onDone={() => home.select(undefined)}
            />
          </div>
        )}

        {home.night && (
          <button type="button" onClick={() => home.setNight(false)} className={`${round} absolute bottom-6 left-1/2 z-[700] -translate-x-1/2 bg-[var(--world-mango,#ffb834)] px-7 text-2xl`}>
            <span aria-hidden="true">☀️</span>Bon dia!
          </button>
        )}

        {!cooking && !home.night && !shopping && (
          <div className={`absolute z-[650] ${viewport.portrait ? 'inset-x-2 bottom-[6.5rem] flex justify-between' : 'inset-x-2 bottom-3 flex items-end justify-between gap-2'}`}>
            {exitButton}
            {!viewport.portrait && tabs}
            {sideButton}
          </div>
        )}
        {!cooking && !home.night && !shopping && viewport.portrait && <div className="absolute bottom-3 left-2 right-[11.5rem] z-[650]">{tabs}</div>}

        {shopping && !cooking && (
          <Catalogue
            room={home.room}
            coins={home.coins}
            owned={home.owned}
            note={home.note}
            onBuy={(id) => void home.buy(id)}
            onPlace={placeFromCatalogue}
            onClose={() => setShopping(false)}
          />
        )}
        <Grain />
      </div>
    </Scene>
  )
}
