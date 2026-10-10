import { stackOf, useStage } from '../../../sandbox/StageContext'
import { CabinetFront } from '../cabinets/CabinetFront'
import { CABINETS, type CabinetId } from '../cabinets/cabinetDefs'
import { BOOTH_SPOT, CABINET_SPOTS, CLAW_SPOT } from './layout'

const focus = 'outline-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--world-focus,#4da6ec)]'

export interface CabinetsLayerProps {
  lit: boolean
  /** The cabinet lit as «Escalfament». */
  warm: CabinetId | undefined
  onOpen: (id: CabinetId) => void
}

/** The three cabinets, standing in the room: walk up and tap one (or press Enter) to see its screen. */
export function CabinetsLayer({ lit, warm, onOpen }: CabinetsLayerProps) {
  const { unit } = useStage()
  const width = Math.max(68, unit * 0.2)
  return (
    <>
      {CABINETS.map((def) => {
        const spot = CABINET_SPOTS[def.id]
        return (
          <div key={def.id} className="absolute" style={{ left: `${spot.x * 100}%`, top: `${(spot.y + 0.012) * 100}%`, width, transform: 'translate(-50%, -100%)', zIndex: stackOf(spot.y) - 4 }}>
            <CabinetFront def={def} lit={lit} warmup={warm === def.id} onOpen={() => onOpen(def.id)} className="w-full" />
          </div>
        )
      })}
    </>
  )
}

interface FixtureButtonProps {
  x: number
  y: number
  /** Size as fractions of the stage unit. */
  w: number
  h: number
  label: string
  testId: string
  onTap: () => void
}

/** A transparent button over a drawing of the room (the claw machine, the booth): it is a real, labelled control. */
export function FixtureButton({ x, y, w, h, label, testId, onTap }: FixtureButtonProps) {
  const { unit } = useStage()
  return (
    <button
      type="button"
      data-fixture={testId}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onTap()
      }}
      className={`absolute m-0 cursor-pointer border-0 bg-transparent p-0 ${focus}`}
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: Math.max(64, unit * w), height: Math.max(64, unit * h), transform: 'translate(-50%, -100%)', zIndex: stackOf(y) - 5 }}
    />
  )
}

export interface PlayThingsProps {
  onClaw: () => void
  onBooth: () => void
}

/** The claw machine and the photo booth as buttons. */
export function PlayThings({ onClaw, onBooth }: PlayThingsProps) {
  return (
    <>
      <FixtureButton x={CLAW_SPOT.x} y={CLAW_SPOT.y} w={0.3} h={0.4} label="La màquina de la grua: juga" testId="claw" onTap={onClaw} />
      <FixtureButton x={BOOTH_SPOT.x} y={BOOTH_SPOT.y} w={0.25} h={0.38} label="La cabina de fotos: fes-te una foto" testId="booth" onTap={onBooth} />
    </>
  )
}
