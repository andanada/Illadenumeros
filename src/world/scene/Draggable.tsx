import { animate, motion, useMotionValue } from 'motion/react'
import { useRef, useState } from 'react'
import { unlockAudio } from '../../core/audio/sfx'
import { capitalise } from './logic/tapPlace'
import { dragOffset, dragReducer, IDLE, type DragEffect, type DragState } from './logic/dragMachine'
import { useScene, type PropInfo } from './SceneContext'
import { useWorldReducedMotion } from './useReducedMotion'
import { worldSfx, type WorldSound } from './worldSfx'

export interface DraggableProps {
  prop: PropInfo
  children: React.ReactNode
  /** Sound of the tap reaction (every prop reacts). */
  sound?: WorldSound
  onTap?: () => void
  /** Can be picked up (drag, tap-to-place, keyboard). False = it only reacts to taps. */
  movable?: boolean
  /** Tap / Enter also holds the prop for tap-to-place (default). False = tap only runs `onTap` (e.g. a price tag handed over). */
  pickOnTap?: boolean
  /** Accessible name when it should differ from the prop label (e.g. "Resposta 12"). */
  name?: string
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

const PICKUP_SPRING = { type: 'spring', stiffness: 520, damping: 18 } as const
const TOSS_SPRING = { type: 'spring', stiffness: 260, damping: 16 } as const

/**
 * A prop of the scene: follows the finger with spring physics, wobbles when lifted, bounces when it lands,
 * and is tossed back home if nothing accepts it. Tap or Enter holds it for tap-to-place.
 */
export function Draggable({ prop, children, sound = 'squish', onTap, movable = true, pickOnTap = true, name, disabled = false, className = '', style }: DraggableProps) {
  const scene = useScene()
  const reduced = useWorldReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  const rotate = useMotionValue(0)
  const drag = useRef<DragState>(IDLE)
  const [lifted, setLifted] = useState(false)
  const held = scene.held?.propId === prop.id

  const bounce = (keys: number[]): void => {
    if (reduced) return
    void animate(scale, keys, { duration: 0.35 })
  }

  const react = (): void => {
    unlockAudio()
    worldSfx[sound]()
    bounce([1, 0.86, 1.12, 1])
    if (!reduced) void animate(rotate, [0, -6, 4, 0], { duration: 0.35 })
    onTap?.()
  }

  const goHome = (accepted: boolean): void => {
    setLifted(false)
    if (accepted || reduced) {
      x.set(0)
      y.set(0)
      scale.set(1)
      rotate.set(0)
      if (accepted) bounce([1.2, 0.9, 1.05, 1])
      return
    }
    worldSfx.boing()
    scene.announce(`${capitalise(prop.label)} torna al seu lloc.`)
    void animate(x, 0, TOSS_SPRING)
    void animate(y, 0, TOSS_SPRING)
    void animate(scale, 1, TOSS_SPRING)
    void animate(rotate, 0, TOSS_SPRING)
  }

  const handle = (effect: DragEffect | undefined): void => {
    if (!effect) return
    if (effect.type === 'tap') {
      react()
      if (movable && pickOnTap) scene.pick(prop)
    } else if (effect.type === 'pickup') {
      unlockAudio()
      worldSfx.lift()
      setLifted(true)
      if (scene.held) scene.cancel()
      if (!reduced) {
        void animate(scale, 1.15, PICKUP_SPRING)
        void animate(rotate, [0, -8, 6, -3, 2], { duration: 0.5 })
      }
    } else if (effect.type === 'release') {
      const accepted = scene.release(prop, effect.point)
      if (accepted) worldSfx.plop()
      goHome(accepted)
    } else goHome(false)
  }

  const step = (event: Parameters<typeof dragReducer>[1]): void => {
    const next = dragReducer(drag.current, event)
    drag.current = next.state
    if (next.state.phase === 'dragging') {
      const offset = dragOffset(next.state)
      x.set(offset.x)
      y.set(offset.y)
      scene.hover(prop, next.state.at)
    }
    handle(next.effect)
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (disabled) return
    if (movable) event.currentTarget.setPointerCapture?.(event.pointerId)
    step({ type: 'down', propId: prop.id, pointerId: event.pointerId, point: { x: event.clientX, y: event.clientY } })
  }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!movable && drag.current.phase === 'pressed') return
    step({ type: 'move', pointerId: event.pointerId, point: { x: event.clientX, y: event.clientY } })
  }
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => step({ type: 'up', pointerId: event.pointerId, point: { x: event.clientX, y: event.clientY } })
  const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>): void => step({ type: 'cancel', pointerId: event.pointerId })

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (disabled) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      react()
      if (!movable || !pickOnTap) return
      scene.pick(prop)
      // Straight to the first place that takes it; arrows move between places.
      const first = scene.zonesFor(prop)[0]
      if (!held && first) requestAnimationFrame(() => first.element()?.focus())
    } else if (event.key === 'Escape' && held) scene.cancel()
  }

  return (
    <motion.div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${name ?? prop.label}${movable && held ? ', agafat' : ''}`}
      aria-pressed={movable ? held : undefined}
      aria-disabled={disabled || undefined}
      data-prop-id={prop.id}
      data-prop-kind={prop.kind}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
      // A prop inside a zone (e.g. an apple in the basket) is tapped, not dropped on.
      onClick={movable ? (event) => event.stopPropagation() : undefined}
      style={{ x, y, scale, rotate, touchAction: movable ? 'none' : 'manipulation', zIndex: lifted ? 50 : undefined, ...style }}
      className={`relative cursor-grab select-none outline-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-chicle)] ${held ? 'drop-shadow-[0_0_10px_rgba(255,79,163,0.9)]' : ''} ${lifted ? 'cursor-grabbing drop-shadow-[0_18px_14px_rgba(42,27,61,0.35)]' : ''} ${className}`}
    >
      {children}
    </motion.div>
  )
}
