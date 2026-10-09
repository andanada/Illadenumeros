import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { unlockAudio } from '../../../../core/audio/sfx'
import { busSfx } from '../busSfx'
import { honk, signal, toggleDrive, toggleNight, toggleWipers, type BusState } from '../freePlay'

export interface BusControlsProps {
  bus: BusState
  onChange: (next: BusState) => void
  /** Driving off is not possible while a neighbour is getting on or off (an errand at the stop). */
  canDrive: boolean
  compact?: boolean
}

function Knob({
  label,
  pressed,
  onPress,
  children,
  className,
  disabled = false,
  compact = false,
}: {
  label: string
  pressed?: boolean
  onPress: () => void
  children: ReactNode
  className: string
  disabled?: boolean
  compact?: boolean
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      whileTap={{ scale: 0.88 }}
      onClick={() => {
        unlockAudio()
        onPress()
      }}
      className={`grid ${compact ? 'min-h-12 min-w-11 text-xl' : 'min-h-14 min-w-14 text-2xl'} place-items-center rounded-[1.2rem] px-2 font-bold shadow-[var(--world-shadow-lift)] disabled:opacity-40 ${pressed ? 'ring-4 ring-white/90' : ''} ${className}`}
    >
      {children}
    </motion.button>
  )
}

/**
 * The driver's dashboard: go / stop, horn, indicators, wipers and day / night. Free play, no coins:
 * everything just reacts (sound, lights, the street scrolling).
 */
export function BusControls({ bus, onChange, canDrive, compact = false }: BusControlsProps) {
  const go = (): void => {
    if (bus.driving) busSfx.brake()
    else busSfx.engine()
    onChange(toggleDrive(bus))
  }
  return (
    <div
      role="group"
      aria-label="Tauler del conductor"
      className={`flex items-center justify-center rounded-[1.6rem] bg-[var(--world-carbo,#34304a)]/85 p-2 ${compact ? 'gap-1.5' : 'max-w-[17rem] flex-wrap gap-2'}`}
    >
      <Knob
        compact={compact}
        label={bus.driving ? 'Para l’autobús' : 'Arrenca l’autobús'}
        pressed={bus.driving}
        disabled={!canDrive && !bus.driving}
        onPress={go}
        className={`${compact ? 'min-w-[5.25rem] text-lg' : 'min-w-28 text-xl'} ${bus.driving ? 'bg-[var(--world-coral,#ff6b5b)] text-white' : 'bg-[var(--world-menta,#36c5a2)] text-white'}`}
      >
        {bus.driving ? '■ Para' : '▶ Arrenca'}
      </Knob>
      <Knob
        compact={compact}
        label="Clàxon"
        onPress={() => {
          busSfx.horn()
          onChange(honk(bus))
        }}
        className="bg-[var(--world-mango,#ffb834)] text-[var(--world-ink,#2b2440)]"
      >
        <span aria-hidden="true">📯</span>
      </Knob>
      <Knob
        compact={compact}
        label="Intermitent esquerre"
        pressed={bus.indicator === 'left'}
        onPress={() => {
          busSfx.tick()
          onChange(signal(bus, 'left'))
        }}
        className="bg-white text-[var(--world-mango,#e8901a)]"
      >
        <span aria-hidden="true">◀</span>
      </Knob>
      <Knob
        compact={compact}
        label="Intermitent dret"
        pressed={bus.indicator === 'right'}
        onPress={() => {
          busSfx.tick()
          onChange(signal(bus, 'right'))
        }}
        className="bg-white text-[var(--world-mango,#e8901a)]"
      >
        <span aria-hidden="true">▶</span>
      </Knob>
      <Knob
        compact={compact}
        label="Eixugaparabrises"
        pressed={bus.wipers}
        onPress={() => {
          busSfx.swish()
          onChange(toggleWipers(bus))
        }}
        className="bg-[var(--world-cel,#4da6ec)] text-white"
      >
        <span aria-hidden="true">🌧️</span>
      </Knob>
      <Knob
        compact={compact}
        label={bus.night ? 'Fes que sigui de dia' : 'Fes que sigui de nit'}
        pressed={bus.night}
        onPress={() => onChange(toggleNight(bus))}
        className="bg-[var(--world-lila,#9a7be6)] text-white"
      >
        <span aria-hidden="true">{bus.night ? '🌙' : '☀️'}</span>
      </Knob>
    </div>
  )
}
