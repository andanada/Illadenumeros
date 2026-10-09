import { useState } from 'react'
import type { GameSummary } from '../../../features/play/gameTypes'
import { unlockAudio } from '../../../core/audio/sfx'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import type { PlaceProps } from '../types'
import { ArcadeBackdrop } from './ArcadeBackdrop'
import { arcadeSfx, useArcadeMusic } from './arcadeSfx'
import { CabinetFront } from './cabinets/CabinetFront'
import { CABINETS, cabinetById, warmupCabinet, type CabinetId } from './cabinets/cabinetDefs'
import { GameCabinet } from './cabinets/GameCabinet'
import { ClawMachine } from './machines/ClawMachine'
import { RoomControls } from './RoomControls'
import { TicketCounter } from './TicketCounter'
import { useArcadePortrait } from './useArcadeLayout'

/**
 * Els Recreatius: three illustrated cabinets that run the speed games on their screens (Duel Llampec, Tren de
 * Sumes, Pesca de Sumes), a claw machine to play with, and the ticket counter with personal-best ribbons.
 * The warm-up on the errand board lights the Duel as «Escalfament»; finishing a round of it ticks it off.
 */
export default function RecreatiusPlace({ pending, callSignal, onSolved, onExit }: PlaceProps) {
  const portrait = useArcadePortrait()
  const [open, setOpen] = useState<CabinetId | undefined>(undefined)
  const [lit, setLit] = useState(true)
  const [music, setMusic] = useState(false)
  const [plays, setPlays] = useState(0)
  const warm = warmupCabinet(pending)
  useArcadeMusic(music && open === undefined)

  const enter = (id: CabinetId): void => {
    unlockAudio()
    arcadeSfx.start()
    setOpen(id)
  }

  // The HUD's board rang: the warm-up cabinet wakes up and she goes straight in (state adjusted during render).
  const [seenSignal, setSeenSignal] = useState(callSignal)
  if (seenSignal !== callSignal) {
    setSeenSignal(callSignal)
    if (pending > 0 && open === undefined) enter('duel')
  }

  const played = (id: CabinetId, summary: GameSummary): void => {
    setPlays((n) => n + 1)
    // A round of the warm-up cabinet answers the board's «Escalfament» (its coins are already given by the answers).
    if (id === 'duel' && pending > 0) onSolved(summary.petals)
  }

  const cabinets = (
    <div className={`flex items-end justify-center ${portrait ? 'gap-2' : 'gap-3'}`}>
      {CABINETS.map((def) => (
        <CabinetFront
          key={def.id}
          def={def}
          lit={lit}
          warmup={warm === def.id}
          onOpen={() => enter(def.id)}
          className={portrait ? 'w-[31%]' : 'w-[min(17vw,12.5rem)]'}
        />
      ))}
    </div>
  )

  const room = portrait ? (
    <div className="relative flex flex-col items-center gap-5 px-3 pb-32 pt-[150px]">
      {cabinets}
      <TicketCounter plays={plays} pending={pending} compact />
      <ClawMachine lit={lit} compact />
    </div>
  ) : (
    <div className="relative flex h-full items-end justify-center gap-3 px-3 pb-24 pt-[150px]">
      <div className="w-[min(14vw,10rem)] shrink-0">
        <ClawMachine lit={lit} compact />
      </div>
      {cabinets}
      <div className="w-[min(22vw,15rem)] shrink-0">
        <TicketCounter plays={plays} pending={pending} compact />
      </div>
    </div>
  )

  const playing = open !== undefined && (
    <div className={`relative px-3 ${portrait ? 'h-dvh pb-3 pt-[76px]' : 'h-full pb-3 pt-[80px]'}`}>
      <GameCabinet def={cabinetById(open)} onExit={() => setOpen(undefined)} onPlayed={(s) => played(open, s)} />
    </div>
  )

  return (
    <Scene label="Els Recreatius" className={portrait ? 'min-h-full w-full' : 'h-full min-h-[38rem] w-full'}>
      <div data-world="nit" className={`relative w-full overflow-x-hidden ${portrait ? 'min-h-dvh' : 'h-full'}`}>
        <ArcadeBackdrop lit={lit} />
        {playing || room}
        {open === undefined && (
          <>
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
            <div className="absolute bottom-3 right-3 z-30">
              <RoomControls lit={lit} music={music} onLit={setLit} onMusic={setMusic} />
            </div>
          </>
        )}
        <Grain />
      </div>
    </Scene>
  )
}
