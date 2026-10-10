import type { ReactNode } from 'react'
import { personHeight } from './Actor'
import { useOptionalCast } from './CastContext'
import { depthScale } from './StageContext'
import { useOptionalStage } from './useOptionalStage'
import './sandbox.css'

export type AnchorState = 'calm' | 'waiting' | 'done'

export interface AnchorProps {
  /** A small picture in the bubble (a muffin, a coin…). */
  icon?: ReactNode
  /** The number the bubble shows next to the icon. */
  number?: number | string
  /** calm: just there · waiting: a little livelier · done: green with a tick, ready to fade. */
  state: AnchorState
  /** Tapped or Enter/Space. Ignoring the bubble is always fine. */
  onActivate: () => void
  /** Accessible name (Catalan): «La Pilar vol 7 magdalenes». */
  label: string
  /** Hangs over this actor's head and follows them. */
  actorId?: string
  /** Or over a point of the nearest positioned ancestor, fractions 0..1 (feet of whoever stands there). */
  at?: { x: number; y: number }
  /** Extra lift in px above the head. */
  lift?: number
  className?: string
}

const TONE: Readonly<Record<AnchorState, { bg: string; ink: string; motion: string }>> = {
  calm: { bg: '#ffffff', ink: 'var(--world-ink,#2b2440)', motion: 'sb-bubble-bob' },
  waiting: { bg: '#fff1c2', ink: 'var(--world-ink,#2b2440)', motion: 'sb-bubble-wait' },
  done: { bg: '#d4f5e9', ink: '#1d6b55', motion: '' },
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M5 13 L10 18 L19 6" stroke="#1d6b55" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

/**
 * The speech bubble of an ambient request. Gentle by design: it bobs softly, never flashes or shakes, can
 * be ignored, and is a real button with a name. Place it over an actor (`actorId`) or at a point (`at`).
 */
export function Anchor({ icon, number, state, onActivate, label, actorId, at, lift = 8, className = '' }: AnchorProps) {
  const cast = useOptionalCast()
  const stage = useOptionalStage()
  const actor = actorId ? cast?.state.actors[actorId] : undefined
  if (actorId && !actor) return null
  if (actor && stage && cast && (actor.room ?? cast.defaultRoom) !== stage.room) return null
  const pos = actor?.at ?? at
  if (!pos) return null
  const height = stage ? personHeight(stage.unit) * depthScale(pos.y, stage.floorTop) * (cast?.seeds[actorId ?? '']?.kind === 'pet' ? 0.5 : 1.12) : actorId ? 150 : 0
  const tone = TONE[state]
  return (
    <div className={`pointer-events-none absolute ${className}`} style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: `translate(-50%, calc(-100% - ${height + lift}px))`, zIndex: 3500 }}>
      <button
        type="button"
        data-anchor={state}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation()
          onActivate()
        }}
        className={`pointer-events-auto relative grid min-h-14 min-w-14 cursor-pointer place-items-center rounded-[1.5rem] border-0 px-3 py-1.5 font-display shadow-[var(--world-shadow-soft)] outline-none transition-transform active:scale-90 focus-visible:outline-4 focus-visible:outline-[var(--world-focus,#4da6ec)] ${tone.motion}`}
        style={{ background: tone.bg, color: tone.ink }}
      >
        <span className="flex items-center gap-1.5 text-2xl font-bold leading-none">
          {icon && <span aria-hidden="true" className="grid place-items-center">{icon}</span>}
          {number !== undefined && <span aria-hidden="true">{number}</span>}
          {state === 'done' && <Tick />}
        </span>
        <span aria-hidden="true" className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 rounded-sm" style={{ background: tone.bg }} />
      </button>
    </div>
  )
}
