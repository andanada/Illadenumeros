import { useCallback, useEffect, useRef, useState } from 'react'
import type { PetId } from '../../../characters'
import type { PropInfo } from '../../../scene/SceneContext'
import { worldSfx } from '../../../scene/worldSfx'
import { useCast } from '../../../sandbox/CastContext'
import { ItemsProvider } from '../../../sandbox/ItemsContext'
import { FURNITURE_BY_ID } from '../furniture/catalog'
import { Catalogue, CATALOGUE_KIND, itemOfProp } from '../home/Catalogue'
import { PieceToolbar } from '../home/PieceToolbar'
import { uidOfProp } from '../home/placedProps'
import { CasaToolbar } from './CasaToolbar'
import { dropSpot } from './dropSpot'
import { HOUSE_DEFS, HOUSE_START } from './items'
import { HouseView } from './HouseView'
import { RequestAnchors } from './RequestAnchors'
import { RequestSheet } from './RequestSheet'
import { stairById, STREET } from './stairs'
import { useCasaRequests } from './useCasaRequests'
import { useHouse } from './useHouse'
import { useLastPointer } from '../home/useLastPointer'
import { defaultSpot, FLOOR_TOP, placementsIn, zoneAt, type FloorId, type ZoneId } from './zones'

export interface HouseWorldProps {
  pet: PetId | undefined
  callSignal: number
  pending: number
  onSolved: (coins: number) => void
  onExit: () => void
  forced?: { skillId: string; factKey?: string }
}

/** The house in play: floors and cast, bubbles of the requests, the decorate mode and the bottom bar. */
export function HouseWorld(props: HouseWorldProps) {
  const cast = useCast()
  const { onExit } = props
  const latest = useRef(cast)
  useEffect(() => {
    latest.current = cast
  })
  const onEnter = useCallback(
    (door: { id: string; to: string }, who: string) => {
      if (door.to === STREET) return onExit()
      const stair = stairById(door.id)
      // Once the new floor is on screen (and its walking grid with it), she steps off the stairs,
      // unless she has already gone somewhere else meanwhile.
      if (stair)
        setTimeout(() => {
          const now = latest.current
          if (now.state.actors[who]?.room === door.to && now.state.actors[who]?.mode === 'idle') now.walkTo(who, stair.landing)
        }, 120)
    },
    [onExit],
  )
  return (
    <ItemsProvider defs={HOUSE_DEFS} start={HOUSE_START} floorTop={FLOOR_TOP} onEnter={onEnter}>
      <Inside {...props} />
    </ItemsProvider>
  )
}

function Inside({ pet, callSignal, onSolved, onExit, forced }: HouseWorldProps) {
  const cast = useCast()
  const house = useHouse()
  const track = useLastPointer()
  const requests = useCasaRequests(pet !== undefined, callSignal, forced)
  const [decorating, setDecorating] = useState(false)
  const [shopping, setShopping] = useState(false)
  const [lights, setLights] = useState<readonly FloorId[]>([])
  const [floors, setFloors] = useState<{ go: (floor: FloorId) => void; scrolls: boolean } | undefined>(undefined)
  const ready = useCallback(
    (go: (floor: FloorId) => void, scrolls: boolean) =>
      setFloors((prev) => (prev && prev.go === go && prev.scrolls === scrolls ? prev : { go, scrolls })),
    [],
  )
  const portrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth * 1.05

  const me = cast.state.actors[cast.state.selected]
  const bed = house.pieces.find((p) => p.item === 'llit' && me?.seat === `${p.uid}-0`)

  const setNight = (night: boolean): void => {
    house.setNight(night)
    setLights([])
    cast.announce(night ? 'Ja és de nit. Pots encendre els llums de cada planta.' : 'Bon dia!')
  }

  const dropped = (zone: ZoneId, prop: PropInfo): void => {
    const el = document.querySelector<HTMLElement>(`[data-zone-id="zona-${zone}"]`)
    if (!el) return
    const rect = el.getBoundingClientRect()
    const count = placementsIn(house.pieces, zone).length
    const base = { zone, rect, track: track.current, now: performance.now(), count }
    if (prop.kind === CATALOGUE_KIND) {
      const id = itemOfProp(prop.id)
      void house.placeNew(id, dropSpot({ ...base, wall: !!FURNITURE_BY_ID[id]?.wall }))
      setShopping(false)
      return
    }
    const piece = house.pieces.find((p) => p.uid === uidOfProp(prop.id))
    if (piece) house.moveTo(piece.uid, dropSpot({ ...base, moving: piece, wall: !!FURNITURE_BY_ID[piece.item]?.wall }))
  }

  const placeFromCatalogue = (id: string): void => {
    const floor = (me?.room ?? cast.defaultRoom) as FloorId
    const zone = zoneAt(floor, me?.at.x ?? 0.3)
    void house.placeNew(id, defaultSpot(zone, placementsIn(house.pieces, zone).length, !!FURNITURE_BY_ID[id]?.wall))
    setShopping(false)
  }

  const selected = house.selected
  return (
    <div data-world={house.night ? 'nit' : 'dia'} className="relative h-full min-h-[30rem] w-full overflow-hidden">
      <HouseView
        house={house}
        decorating={decorating}
        lights={lights}
        onLight={(f) => setLights((l) => (l.includes(f) ? l.filter((x) => x !== f) : [...l, f]))}
        onDrop={dropped}
        onReady={ready}
      >
        <RequestAnchors bubbles={requests.bubbles} onTap={requests.tap} />
      </HouseView>

      {!shopping && (
        <CasaToolbar
          portrait={portrait}
          decorating={decorating}
          onDecorate={() => {
            setDecorating(!decorating)
            setShopping(false)
            house.select(undefined)
          }}
          onShop={() => setShopping(true)}
          night={house.night}
          onNight={() => setNight(!house.night)}
          canSleep={bed !== undefined && !house.night}
          onSleep={() => {
            worldSfx.purr()
            cast.emote(cast.state.selected, 'son', 3000)
            setNight(true)
          }}
          floors={floors?.scrolls ? floors.go : undefined}
          onExit={() => {
            worldSfx.doorClose()
            onExit()
          }}
        />
      )}

      {decorating && selected && !shopping && (
        <div className="pointer-events-none absolute inset-x-2 top-[96px] z-[800] flex justify-center">
          <PieceToolbar
            piece={selected}
            lit={house.lit.includes(selected.uid)}
            onNudge={house.nudgeSelected}
            onFlip={house.flipSelected}
            onColour={house.recolourSelected}
            onAction={() => {
              if (FURNITURE_BY_ID[selected.item]?.action === 'bed') {
                house.select(undefined)
                setNight(true)
              } else house.toggleLamp(selected.uid)
            }}
            onStore={house.storeSelected}
            onDone={() => house.select(undefined)}
          />
        </div>
      )}

      {shopping && (
        <Catalogue
          room={zoneAt((me?.room ?? 'baixa') as FloorId, me?.at.x ?? 0.3)}
          coins={house.coins}
          owned={house.owned}
          note={house.note}
          onBuy={(id) => void house.buy(id)}
          onPlace={placeFromCatalogue}
          onClose={() => setShopping(false)}
        />
      )}

      {requests.open && (
        <RequestSheet
          key={requests.open.request.id}
          request={requests.open.request}
          askerId={requests.open.askerId}
          pet={pet}
          onSolved={onSolved}
          onClose={requests.close}
          {...(forced ? { forced } : {})}
        />
      )}
    </div>
  )
}
