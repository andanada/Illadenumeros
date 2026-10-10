import { useEffect, useRef, useState } from 'react'
import { unlockAudio } from '../../../../core/audio/sfx'
import type { GameSummary } from '../../../../features/play/gameTypes'
import { ErrandTaskArea } from '../../../errands/ErrandStage'
import type { Errand } from '../../../errands/useErrand'
import type { PlaceRequest } from '../../../requests/useRequests'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { worldSfx } from '../../../scene/worldSfx'
import { RequestCard } from '../../shared/RequestCard'
import { RoomSwitcher } from '../../shared/RoomSwitcher'
import { ArcadeBackdrop } from '../ArcadeBackdrop'
import { arcadeSfx, useArcadeMusic } from '../arcadeSfx'
import { cabinetById, type CabinetId } from '../cabinets/cabinetDefs'
import { GameCabinet } from '../cabinets/GameCabinet'
import { RibbonsBoard } from '../RibbonsBoard'
import { RoomControls } from '../RoomControls'
import { ArcadeRoom } from './ArcadeRoom'
import { ClawScreen } from './ClawScreen'
import { PRIZE_UIDS, TRAY_UID } from './items'
import { ARCADE_FLOOR_TOP, boothStand, cabinetStand, clawStand, CLERK_ID, COUNTER_SURFACE } from './layout'
import { PhotoOverlay } from './PhotoOverlay'
import { useArcadeLife } from './useArcadeLife'
import { bubblesFor, clerkNumber, waitingCount } from './useArcadeRequests'

export interface ArcadeWorldProps {
  errand: Errand
  requests: readonly PlaceRequest[]
  pending: number
  callSignal: number
  onSolved: (coins: number) => void
  onExit: () => void
}

type Screen = 'claw' | 'photo' | undefined

/** Everything of the arcade inside the providers: the room, the screens she opens, the bubbles and the dock. */
export function ArcadeWorld({ errand, requests, pending, callSignal, onSolved, onExit }: ArcadeWorldProps) {
  const cast = useCast()
  const items = useItems()
  const [open, setOpen] = useState<CabinetId | undefined>(undefined)
  const [screen, setScreen] = useState<Screen>(undefined)
  const [lit, setLit] = useState(true)
  const [music, setMusic] = useState(false)
  const [plays, setPlays] = useState(0)
  const [wins, setWins] = useState(0)
  const [clerkOpen, setClerkOpen] = useState(false)
  useArcadeMusic(music && open === undefined)
  useArcadeLife()

  const bubbles = bubblesFor(waitingCount(requests, pending))
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640
  const warm: CabinetId | undefined = bubbles.warm ? 'duel' : undefined
  const latest = useRef({ cast, pending })
  useEffect(() => {
    latest.current = { cast, pending }
  })

  /** She walks up to it first, then it opens: the room is a place, not a menu. */
  const walkThen = (to: { x: number; y: number }, then: () => void): void => {
    unlockAudio()
    cast.walkTo(cast.state.selected, to, then)
  }
  const openCabinet = (id: CabinetId): void =>
    walkThen(cabinetStand(id), () => {
      arcadeSfx.start()
      latest.current.cast.announce(`${cabinetById(id).title}: la pantalla s’encén.`)
      setOpen(id)
    })

  const seen = useRef(callSignal)
  useEffect(() => {
    if (seen.current === callSignal) return
    seen.current = callSignal
    // The HUD's board rang: the warm-up cabinet wakes up and she goes straight to it.
    if (latest.current.pending > 0 && open === undefined) openCabinet('duel')
    // `openCabinet` reads everything through `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callSignal])

  const played = (id: CabinetId, summary: GameSummary): void => {
    setPlays((n) => n + 1)
    // A round of the warm-up cabinet answers the board's «Escalfament» (its coins are already given by the answers).
    if (id === 'duel' && pending > 0) onSolved(summary.petals)
  }

  const taken = PRIZE_UIDS.filter((uid) => items.items[uid]?.loc.t !== 'in').length
  const trayOpen = items.items[TRAY_UID]?.open === true
  const locked = !trayOpen && wins <= taken
  const closeClerk = (): void => {
    errand.next()
    setClerkOpen(false)
  }
  const clerk =
    bubbles.clerk || clerkOpen
      ? { number: clerkNumber(errand.item), active: clerkOpen, done: clerkOpen && errand.phase === 'thanks', onTap: () => walkThen(COUNTER_SURFACE.stand, () => setClerkOpen(true)) }
      : undefined
  useEffect(() => {
    if (errand.phase === 'thanks' && clerkOpen) latest.current.cast.emote(CLERK_ID, 'cor', 2600)
    // Only when the thanks arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand.phase])

  if (open) {
    return (
      <div className="relative h-dvh w-full overflow-hidden" data-world="nit">
        <ArcadeBackdrop lit={lit} floorTop={ARCADE_FLOOR_TOP} />
        <div className="relative h-full px-3 pb-3 pt-[80px]">
          <GameCabinet def={cabinetById(open)} onExit={() => setOpen(undefined)} onPlayed={(s) => played(open, s)} />
        </div>
      </div>
    )
  }

  return (
    <div data-world="nit" className="relative flex h-dvh min-h-[34rem] w-full flex-col overflow-hidden bg-[#2f2a5a]">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ArcadeRoom
          lit={lit}
          warm={warm}
          onCabinet={openCabinet}
          onClaw={() => walkThen(clawStand, () => setScreen('claw'))}
          onBooth={() => walkThen(boothStand, () => setScreen('photo'))}
          clerk={clerk}
          trayLock={{ locked, onTap: () => cast.announce('La safata de premis és tancada: primer guanya un premi a la màquina de la grua!') }}
        />
        <div className="absolute right-2 top-[92px] z-[3000] w-[min(11rem,40%)]">
          <RibbonsBoard plays={plays} size={narrow ? 34 : 46} />
        </div>
        {screen === 'claw' && (
          <ClawScreen
            lit={lit}
            compact
            onPrize={() => {
              setWins((n) => n + 1)
              cast.announce('Ho has agafat! El premi és a la safata, davant la màquina.')
            }}
            onClose={() => setScreen(undefined)}
          />
        )}
        {screen === 'photo' && <PhotoOverlay actorId={cast.state.selected} onClose={() => setScreen(undefined)} />}
        {clerkOpen && (
          <div className="absolute inset-x-0 bottom-0 z-[3500] p-2">
            <RequestCard errand={errand} placeName="els Recreatius" onClose={closeClerk}>
              <ErrandTaskArea errand={errand} />
            </RequestCard>
          </div>
        )}
      </div>
      <div className="flex w-full flex-wrap items-center justify-between gap-2 px-2 pb-2 pt-2">
        <RoomSwitcher room="sala" className="!pointer-events-auto !static" />
        <RoomControls lit={lit} music={music} onLit={setLit} onMusic={setMusic} />
        <div className="flex min-h-[4.75rem] items-center max-sm:basis-full max-sm:pr-36 sm:min-h-0">
          <button
            type="button"
            onClick={() => {
              worldSfx.doorClose()
              onExit()
            }}
            className="flex min-h-16 items-center gap-2 rounded-full bg-white px-5 text-xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)]"
          >
            <span aria-hidden="true">🚪</span>Surt al carrer
          </button>
        </div>
      </div>
    </div>
  )
}
