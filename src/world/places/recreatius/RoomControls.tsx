import { unlockAudio } from '../../../core/audio/sfx'
import { arcadeSfx } from './arcadeSfx'

const knob = 'grid min-h-16 min-w-16 place-items-center rounded-full px-4 text-2xl shadow-[var(--world-shadow-lift)] active:translate-y-0.5'

export interface RoomControlsProps {
  lit: boolean
  music: boolean
  onLit: (next: boolean) => void
  onMusic: (next: boolean) => void
}

/** The room's two switches: lights and music (free play, no coins). */
export function RoomControls({ lit, music, onLit, onMusic }: RoomControlsProps) {
  return (
    <div role="group" aria-label="Sala" className="flex items-center gap-2">
      <button
        type="button"
        aria-label={lit ? 'Apaga els llums' : 'Encén els llums'}
        aria-pressed={lit}
        onClick={() => {
          unlockAudio()
          arcadeSfx.lights()
          onLit(!lit)
        }}
        className={`${knob} ${lit ? 'bg-[var(--world-mango,#ffb834)]' : 'bg-white/90'}`}
      >
        <span aria-hidden="true">{lit ? '💡' : '🌑'}</span>
      </button>
      <button
        type="button"
        aria-label={music ? 'Atura la música' : 'Posa música'}
        aria-pressed={music}
        onClick={() => {
          unlockAudio()
          arcadeSfx.button()
          onMusic(!music)
        }}
        className={`${knob} ${music ? 'bg-[var(--world-menta,#36c5a2)] text-white' : 'bg-white/90'}`}
      >
        <span aria-hidden="true">{music ? '🎵' : '🎶'}</span>
      </button>
    </div>
  )
}
