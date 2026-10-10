import { Anchor } from '../../../sandbox/Anchor'
import { Stage } from '../../../sandbox/Stage'
import { PieceScale } from './PieceScale'
import { stackOf } from '../../../sandbox/StageContext'
import { ArcadeBackdrop } from '../ArcadeBackdrop'
import type { CabinetId } from '../cabinets/cabinetDefs'
import { ArcadeFixtures } from './ArcadeArt'
import { CabinetsLayer, PlayThings } from './PlayThings'
import { ARCADE_BLOCKS, ARCADE_FLOOR_TOP, ARCADE_SEATS, CABINET_SPOTS, CLERK_ID, COUNTER_SURFACE, EXIT_DOOR } from './layout'
import { ARCADE_ROOM } from './items'

export interface ClerkBubble {
  readonly number: string
  readonly active: boolean
  readonly done: boolean
  onTap: () => void
}

export interface ArcadeRoomProps {
  lit: boolean
  warm: CabinetId | undefined
  /** Tapping the warm-up bubble or the cabinet. */
  onCabinet: (id: CabinetId) => void
  onClaw: () => void
  onBooth: () => void
  clerk: ClerkBubble | undefined
  /** The prize tray is closed until a toy has been won: this covers it with an explanation. */
  trayLock: { locked: boolean; onTap: () => void }
}

/** The warm-up bubble over the cabinet it lights (a request that can be ignored). */
function WarmBubble({ id, onTap }: { id: CabinetId; onTap: () => void }) {
  return <Anchor at={CABINET_SPOTS[id]} state="waiting" icon={<span className="text-2xl">⚡</span>} label="Escalfament al Duel Llampec: toca per jugar" onActivate={onTap} />
}

/** The arcade you walk through: cabinets, claw machine, photo booth, prize counter and air hockey, with the kids and the clerk. */
export function ArcadeRoom({ lit, warm, onCabinet, onClaw, onBooth, clerk, trayLock }: ArcadeRoomProps) {
  return (
    <Stage
      label="Els Recreatius"
      room={ARCADE_ROOM}
      floorTop={ARCADE_FLOOR_TOP}
      backdrop={<ArcadeBackdrop lit={lit} floorTop={ARCADE_FLOOR_TOP} />}
      blocks={ARCADE_BLOCKS}
      seats={ARCADE_SEATS}
      doors={[EXIT_DOOR]}
      surfaces={[COUNTER_SURFACE]}
      switcher={false}
    >
      <PieceScale>
        <ArcadeFixtures lit={lit} />
        <CabinetsLayer lit={lit} warm={warm} onOpen={onCabinet} />
        <PlayThings onClaw={onClaw} onBooth={onBooth} />
      </PieceScale>
      {warm && <WarmBubble id={warm} onTap={() => onCabinet(warm)} />}
      {clerk && (
        <Anchor
          actorId={CLERK_ID}
          state={clerk.done ? 'done' : clerk.active ? 'waiting' : 'waiting'}
          number={clerk.number}
          icon={<span className="text-2xl">🎟️</span>}
          label={`En Kofi necessita ajuda amb els premis: ${clerk.number}`}
          onActivate={clerk.onTap}
        />
      )}
      {trayLock.locked && (
        <button
          type="button"
          data-fixture="tray-lock"
          aria-label="La safata de premis: primer guanya un premi a la grua"
          onClick={(e) => {
            e.stopPropagation()
            trayLock.onTap()
          }}
          className="absolute m-0 cursor-pointer rounded-2xl border-0 bg-transparent p-0 outline-none focus-visible:outline-4 focus-visible:outline-[var(--world-focus,#4da6ec)]"
          style={{ left: '25%', top: '85%', width: 'max(72px, 13%)', height: 'max(64px, 12%)', transform: 'translate(-50%, -100%)', zIndex: stackOf(0.85) + 200 }}
        />
      )}
    </Stage>
  )
}
