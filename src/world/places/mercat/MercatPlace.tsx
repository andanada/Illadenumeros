import { useMemo, useState } from 'react'
import { useProgress } from '../../../core/progress/store'
import { PropArt } from '../../art/props'
import { NEIGHBOURS_BY_ID } from '../../characters'
import { useWorld } from '../../data'
import { useErrand } from '../../errands/useErrand'
import { useRequests } from '../../requests/useRequests'
import { Anchor, type AnchorState } from '../../sandbox/Anchor'
import { CastProvider, useCast } from '../../sandbox/CastContext'
import { ItemsProvider } from '../../sandbox/ItemsContext'
import { Stage } from '../../sandbox/Stage'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import type { DoorDef } from '../../sandbox/types'
import { RoomSwitcher } from '../shared/RoomSwitcher'
import type { PlaceProps } from '../types'
import { MERCAT_ADAPTERS as ADAPTERS, marketModeOf } from './errands/mercatAdapters'
import { MERCAT_GAME_ID, MERCAT_SKILLS } from './mercatSkills'
import { AVATAR, carrierFor, marketSeeds, SHOPPERS } from './market/cast'
import { MarketSheet, ScaleCard, TrayCard } from './market/MarketCards'
import { BagArt, MARKET_DEFS } from './market/items'
import { ScaleReadout } from './market/ScaleReadout'
import { BACKDROP, bagsZone, BLOCKS, DOORS, FLOOR_TOP, FREE_ZONES, MARKET_START, ROOM, SEATS, STREET, SURFACES, trayZone } from './market/rooms'
import { useMarketLife } from './market/useMarketLife'
import '../../sandbox/sandbox.css'

interface WorldProps extends PlaceProps {
  open: boolean
  setOpen: (open: boolean) => void
}

const exitClass = 'absolute bottom-3 left-3 z-[4100] flex min-h-16 items-center gap-2 rounded-full bg-white px-5 text-xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)]'

function Mini({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="6 20 88 80" width={30} height={30} aria-hidden="true">
      {children}
    </svg>
  )
}

interface BubbleProps {
  carrier: string | undefined
  icon: React.ReactNode
  number: string | undefined
  state: AnchorState
  label: string
  onTap: () => void
}

/** The stage of the square: stalls, people, the two scales' screens and the carrier's bubble. */
function MarketStage({ carrier, icon, number, state, label, onTap }: BubbleProps) {
  const cast = useCast()
  const here = carrier ? (cast.state.actors[carrier]?.room ?? cast.defaultRoom) === ROOM : false
  return (
    <Stage label="La plaça del mercat" room={ROOM} floorTop={FLOOR_TOP} backdrop={BACKDROP} blocks={BLOCKS} seats={SEATS} doors={DOORS} surfaces={SURFACES} switcher={false}>
      <ScaleReadout zoneId="bascula" />
      <ScaleReadout zoneId="bascula-peticio" name="Bàscula gran" />
      {here && carrier && <Anchor actorId={carrier} state={state} {...(number !== undefined ? { number } : {})} icon={icon} label={label} onActivate={onTap} />}
      <RoomSwitcher />
    </Stage>
  )
}

/** The market as a living place: stalls to arrange, scales, a cashier tray, shoppers; maths in ignorable bubbles. */
function MarketWorld({ pending, onSolved, onExit, forced, open, setOpen }: WorldProps) {
  const errand = useErrand({ gameId: MERCAT_GAME_ID, skillIds: MERCAT_SKILLS, adapters: ADAPTERS, onSolved, ...(forced ? { forced } : {}) })
  const live = useRequests('mercat')
  const first = live.requests[0]
  const carrier = first ? carrierFor(first.actorId, first.id) : pending > 0 || forced ? SHOPPERS[0] : undefined
  useMarketLife(open)
  const mode = marketModeOf(errand.item)
  const name = (carrier && NEIGHBOURS_BY_ID[carrier]?.name) ?? 'un veí'
  const calm = first?.status === 'calm'
  const state: AnchorState = errand.phase === 'thanks' ? 'done' : calm ? 'calm' : 'waiting'
  const number = mode.kind === 'scale' ? mode.task.kg : undefined

  const zones = useMemo(() => {
    if (!open) return FREE_ZONES
    if (mode.kind === 'scale') return [...FREE_ZONES, bagsZone(mode.task)]
    return mode.kind === 'tray' ? [...FREE_ZONES, trayZone()] : FREE_ZONES
  }, [open, mode])

  const tapBubble = (): void => {
    worldSfx.doorbell()
    if (calm) live.wakeRequests()
    setOpen(true)
  }
  const close = (): void => {
    if (errand.phase === 'thanks' || errand.phase === 'shown') errand.next()
    setOpen(false)
  }
  const icon =
    mode.kind === 'scale' ? (
      <Mini>
        <BagArt />
      </Mini>
    ) : mode.kind === 'tray' ? (
      <PropArt id="moneda-poble" size={30} title="" shadow={false} />
    ) : (
      <PropArt id="etiqueta-preu" size={30} title="" shadow={false} />
    )
  const wish = number === undefined ? '' : ` (${number} kg)`

  return (
    <>
      <div className="absolute inset-x-0 bottom-0 top-[84px] flex flex-col portrait:pb-[88px]">
        <ItemsProvider
          defs={MARKET_DEFS}
          start={MARKET_START}
          floorTop={FLOOR_TOP}
          zones={zones}
          onEnter={(door: DoorDef, who: string) => {
            if (door.to === STREET && who === AVATAR) onExit()
          }}
        >
          <div className="relative mx-auto min-h-0 w-full max-h-[150vw] flex-1">
            <MarketStage carrier={carrier} icon={icon} number={number} state={state} label={`${name} espera${wish}: toca per ajudar`} onTap={tapBubble} />
          </div>
          {open && mode.kind === 'scale' && (
            <div className="max-h-[42%] shrink-0 overflow-y-auto px-2 pb-2 landscape:pl-[236px]">
              <ScaleCard errand={errand} task={mode.task} onClose={close} />
            </div>
          )}
          {open && mode.kind === 'tray' && (
            <div className="max-h-[42%] shrink-0 overflow-y-auto px-2 pb-2 landscape:pl-[236px]">
              <TrayCard errand={errand} task={mode.task} onClose={close} />
            </div>
          )}
        </ItemsProvider>
      </div>
      {open && mode.kind === 'sheet' && <MarketSheet errand={errand} onClose={close} />}
    </>
  )
}

/**
 * El Mercat: a square with four stalls (fruit, cheese, flowers, clothes) with decimal prices and discount tags, a scale,
 * a cashier tray and shoppers to move. Free play first (arrange the goods, weigh, toss oranges); maths hangs in bubbles:
 * tenths with the scale, adding prices and discounts with coins, and the rest of fifth grade on the market sheet.
 */
export default function MercatPlace(props: PlaceProps) {
  const { callSignal, onExit } = props
  const { avatar } = useWorld()
  const name = useProgress((s) => s.profile?.name)
  const seeds = useMemo(() => marketSeeds(avatar, name), [avatar, name])
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(callSignal)
  if (seen !== callSignal) {
    setSeen(callSignal)
    setOpen(true)
  }
  return (
    <Scene label="El Mercat" className="h-full min-h-[34rem] w-full">
      <div data-world="dia" className="relative h-full w-full overflow-hidden" style={{ background: 'linear-gradient(#c9e8ff 0 90px, #e3cfa8 90px)' }}>
        <h1 className="sr-only">El Mercat</h1>
        <CastProvider seeds={seeds} initialSelected={AVATAR} defaultRoom={ROOM}>
          <MarketWorld {...props} open={open} setOpen={setOpen} />
        </CastProvider>
        <button
          type="button"
          onClick={() => {
            worldSfx.doorClose()
            onExit()
          }}
          className={exitClass}
        >
          <span aria-hidden="true">🚪</span>Surt al carrer
        </button>
        <Grain />
      </div>
    </Scene>
  )
}
