import { stackOf, useStage } from '../../../sandbox/StageContext'
import { BUS_POLE } from './busLayout'

/** Above every pet (a pet never stands over what you can touch) but below the people standing in front of the pole. */
const POLE_Z = stackOf(0.85) + 1

const focus = 'outline-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--world-focus,#4da6ec)]'

export interface BusSpotsProps {
  requested: boolean
  onPole: () => void
  onStopButton: () => void
}

/** The two things of the bus you can touch besides seats and doors: the pole (hold on) and the red stop button. */
export function BusSpots({ requested, onPole, onStopButton }: BusSpotsProps) {
  const { h } = useStage()
  const side = Math.max(64, h * 0.12)
  return (
    <>
      <button
        type="button"
        data-spot="pole"
        aria-label="Agafa’t a la barra"
        onClick={(e) => {
          e.stopPropagation()
          onPole()
        }}
        className={`absolute m-0 cursor-pointer border-0 bg-transparent p-0 ${focus}`}
        style={{ left: `${BUS_POLE.x * 100}%`, top: `${(BUS_POLE.y + 0.1) * 100}%`, width: Math.max(48, h * 0.1), height: h * 0.2, transform: 'translate(-50%, -100%)', zIndex: POLE_Z }}
      />
      <button
        type="button"
        data-spot="stop-button"
        aria-label={requested ? 'Parada demanada' : 'Prem el botó de parada'}
        aria-pressed={requested}
        onClick={(e) => {
          e.stopPropagation()
          onStopButton()
        }}
        className={`absolute m-0 grid cursor-pointer place-items-center rounded-full border-4 border-white p-0 shadow-[var(--world-shadow-soft)] ${focus}`}
        style={{ left: `${BUS_POLE.x * 100}%`, top: '45%', width: side * 0.85, height: side * 0.85, transform: 'translate(-50%, -50%)', background: requested ? '#ff6b5b' : '#c4443a', zIndex: 3000 }}
      >
        <span aria-hidden="true" className="text-xs font-bold leading-none text-white">
          {requested ? 'OK' : 'STOP'}
        </span>
      </button>
    </>
  )
}
