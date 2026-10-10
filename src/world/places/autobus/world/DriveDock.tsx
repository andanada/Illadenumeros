import { jumpLabel, type Jump } from '../../../../games/cursa-recta/jumpLogic'
import { unlockAudio } from '../../../../core/audio/sfx'
import type { Indicator } from '../freePlay'
import { pedalAllowed } from './route'

const PEDALS: ReadonlyArray<{ jump: Jump; name: string; style: string }> = [
  { jump: -10, name: 'Endarrere 10 parades', style: 'bg-[var(--world-mango,#ffb834)] text-[var(--world-ink,#2b2440)]' },
  { jump: -1, name: 'Endarrere 1 parada', style: 'bg-[var(--world-menta,#36c5a2)] text-white' },
  { jump: 1, name: 'Endavant 1 parada', style: 'bg-[var(--world-cel,#4da6ec)] text-white' },
  { jump: 10, name: 'Endavant 10 parades', style: 'bg-[var(--world-coral,#ff6b5b)] text-white' },
]

const knob = 'grid min-h-16 min-w-16 place-items-center rounded-[1.2rem] px-2 text-2xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-40'

export interface DriveDockProps {
  stop: number
  driving: boolean
  /** The driver sits at the wheel and the child is aboard. */
  ready: boolean
  /** Why the bus cannot go (shown instead of silence). */
  why: string | undefined
  /** Show the toys of the cab (horn, lights…) besides the pedals. */
  toys?: boolean
  night: boolean
  wipers: boolean
  indicator: Indicator
  onJump: (jump: Jump) => void
  onHonk: () => void
  onNight: () => void
  onWipers: () => void
  onIndicator: (side: 'left' | 'right') => void
}

/** The driver's dashboard: pedals that move the bus along the numbered stops, and the little toys of the cab. */
export function DriveDock(p: DriveDockProps) {
  const act = (fn: () => void) => () => {
    unlockAudio()
    fn()
  }
  return (
    <div role="group" aria-label="El quadre del conductor" className="flex flex-wrap items-center justify-center gap-2">
      <div role="group" aria-label="Pedals de l’autobús" className="flex items-center gap-2">
        {PEDALS.map(({ jump, name, style }) => (
          <button key={jump} type="button" aria-label={name} disabled={!p.ready || p.driving || !pedalAllowed(p.stop, jump)} onClick={act(() => p.onJump(jump))} className={`${knob} min-w-[4.5rem] tabular-nums ${style}`}>
            {jumpLabel(jump)}
          </button>
        ))}
      </div>
      {p.toys !== false && (
      <div role="group" aria-label="Eines de la cabina" className="flex items-center gap-2">
        <button type="button" aria-label="Clàxon" onClick={act(p.onHonk)} className={`${knob} bg-white`}>
          <span aria-hidden="true">📯</span>
        </button>
        <button type="button" aria-label="Intermitent esquerre" aria-pressed={p.indicator === 'left'} onClick={act(() => p.onIndicator('left'))} className={`${knob} ${p.indicator === 'left' ? 'bg-[var(--world-mango,#ffb834)]' : 'bg-white'}`}>
          <span aria-hidden="true">◀</span>
        </button>
        <button type="button" aria-label="Intermitent dret" aria-pressed={p.indicator === 'right'} onClick={act(() => p.onIndicator('right'))} className={`${knob} ${p.indicator === 'right' ? 'bg-[var(--world-mango,#ffb834)]' : 'bg-white'}`}>
          <span aria-hidden="true">▶</span>
        </button>
        <button type="button" aria-label="Eixugaparabrises" aria-pressed={p.wipers} onClick={act(p.onWipers)} className={`${knob} ${p.wipers ? 'bg-[var(--world-cel,#4da6ec)]' : 'bg-white'}`}>
          <span aria-hidden="true">🌧</span>
        </button>
        <button type="button" aria-label={p.night ? 'Fes que sigui de dia' : 'Fes que sigui de nit'} aria-pressed={p.night} onClick={act(p.onNight)} className={`${knob} ${p.night ? 'bg-[var(--world-lila,#9a7be6)] text-white' : 'bg-white'}`}>
          <span aria-hidden="true">{p.night ? '☀️' : '🌙'}</span>
        </button>
      </div>
      )}
      {p.why && (
        <p role="status" aria-live="polite" data-testid="drive-why" className="w-full text-center text-base font-bold text-white drop-shadow sm:text-lg">
          {p.why}
        </p>
      )}
    </div>
  )
}
