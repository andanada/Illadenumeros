import { useRef } from 'react'
import { unlockAudio } from '../../../core/audio/sfx'
import { worldSfx } from '../worldSfx'

const HOLD_MS = 280

export interface StreetArrowProps {
  side: 'left' | 'right'
  disabled: boolean
  /** A tap or Enter: one good stride. */
  onStep: () => void
  /** Held down: keep walking until released. */
  onHold: () => void
  onRelease: () => void
}

/**
 * The accessible way to walk: tap = a stride, hold = keep walking, Enter/Space on the keyboard = a stride.
 */
export function StreetArrow({ side, disabled, onStep, onHold, onRelease }: StreetArrowProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const holding = useRef(false)

  const cancel = (): void => {
    if (timer.current !== undefined) clearTimeout(timer.current)
    timer.current = undefined
    if (holding.current) onRelease()
  }

  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Camina cap a l’esquerra' : 'Camina cap a la dreta'}
      disabled={disabled}
      onPointerDown={() => {
        holding.current = false
        timer.current = setTimeout(() => {
          holding.current = true
          unlockAudio()
          onHold()
        }, HOLD_MS)
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onClick={() => {
        if (holding.current) {
          holding.current = false
          return
        }
        unlockAudio()
        worldSfx.whoosh()
        onStep()
      }}
      className={`absolute top-1/2 z-40 grid size-16 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-3xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)] transition-opacity active:scale-95 disabled:opacity-0 ${side === 'left' ? 'left-3' : 'right-3'}`}
    >
      <span aria-hidden="true">{side === 'left' ? '‹' : '›'}</span>
    </button>
  )
}
