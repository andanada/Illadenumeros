import { useEffect, useRef } from 'react'
import { cycleIndex } from './logic/hitTest'
import { toPlace } from './logic/tapPlace'
import { useScene, type PropInfo } from './SceneContext'

export interface DropZoneProps {
  id: string
  /** Catalan, with article: "la cistella". */
  label: string
  accepts: (prop: PropInfo) => boolean
  onDrop: (prop: PropInfo) => void
  z?: number
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

/**
 * A place where props can be put. While a prop is held (tap or keyboard) the zones that take it become
 * buttons: tap / Enter puts it there, arrows or Tab go to the next one, Escape lets go.
 */
export function DropZone({ id, label, accepts, onDrop, z, children, className = '', style }: DropZoneProps) {
  const scene = useScene()
  const ref = useRef<HTMLDivElement>(null)
  const latest = useRef({ label, accepts, onDrop, z })
  useEffect(() => {
    latest.current = { label, accepts, onDrop, z }
  })

  const { registerZone } = scene
  useEffect(
    () =>
      registerZone({
        id,
        get label() {
          return latest.current.label
        },
        accepts: (prop) => latest.current.accepts(prop),
        onDrop: (prop) => latest.current.onDrop(prop),
        element: () => ref.current,
        ...(latest.current.z !== undefined ? { z: latest.current.z } : {}),
      }),
    [id, registerZone],
  )

  const heldProp = scene.heldProp
  const active = heldProp !== undefined && accepts(heldProp)
  const hovered = scene.hoverZoneId === id

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!heldProp) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      scene.place(id)
    } else if (event.key === 'Escape') {
      scene.cancel()
    } else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault()
      const zones = scene.zonesFor(heldProp)
      const index = zones.findIndex((zone) => zone.id === id)
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
      zones[cycleIndex(index, zones.length, step)]?.element()?.focus()
    }
  }

  return (
    <div
      ref={ref}
      data-zone-id={id}
      role={active ? 'button' : 'group'}
      aria-label={active ? `Posa-ho ${toPlace(label)}` : label}
      tabIndex={active ? 0 : -1}
      onClick={active ? () => scene.place(id) : undefined}
      onKeyDown={onKeyDown}
      style={style}
      className={`relative rounded-[1.4rem] transition-shadow ${active ? 'cursor-pointer ring-4 ring-[var(--color-sol)]/80 ring-offset-2 ring-offset-transparent' : ''} ${hovered ? 'ring-8 ring-[var(--color-menta)]' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
