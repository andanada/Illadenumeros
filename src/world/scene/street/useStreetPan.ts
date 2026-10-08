import { animate, useMotionValue, type MotionValue } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { DRAG_THRESHOLD_PX } from '../logic/dragMachine'
import { clamp, glideStep, offsetToCentre, pushSample, releaseVelocity, rubberBand, type Sample } from '../logic/inertia'

/** Calls `measure` when the element resizes (window resize where ResizeObserver is missing). Returns the cleanup. */
export function watchSize(el: Element, measure: () => void): () => void {
  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }
  const observer = new ResizeObserver(measure)
  observer.observe(el)
  return () => observer.disconnect()
}

export interface StreetPan {
  x: MotionValue<number>
  viewportRef: React.RefObject<HTMLDivElement | null>
  viewport: number
  min: number
  /** -1 / 0 / 1: last direction the street moved (the avatar looks that way). */
  direction: number
  atStart: boolean
  atEnd: boolean
  handlers: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void
    onClickCapture: (e: React.MouseEvent<HTMLDivElement>) => void
  }
  step: (dir: 1 | -1) => void
  centreOn: (streetX: number) => void
}

/** Drag / flick panning of the panoramic street, with inertia (none with reduced motion). */
export function useStreetPan(width: number, reduced: boolean, initial = 0): StreetPan {
  const x = useMotionValue(initial)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState(0)
  const [edges, setEdges] = useState({ atStart: initial >= 0, atEnd: false, direction: 0 })
  const gesture = useRef<{ id: number; startX: number; startOffset: number; samples: Sample[]; moved: boolean } | undefined>(undefined)
  const frame = useRef<number | undefined>(undefined)
  const suppressClick = useRef(false)
  const min = viewport === 0 ? 0 : Math.min(0, viewport - width)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = (): void => setViewport(el.clientWidth)
    measure()
    return watchSize(el, measure)
  }, [])

  useEffect(
    () =>
      x.on('change', (value) => {
        setEdges((e) => {
          const next = { atStart: value >= -1, atEnd: value <= min + 1, direction: e.direction }
          return next.atStart === e.atStart && next.atEnd === e.atEnd ? e : next
        })
      }),
    [x, min],
  )

  // A resize may leave the street past its end.
  useEffect(() => {
    if (viewport > 0) x.set(clamp(x.get(), min, 0))
  }, [x, min, viewport])

  const stop = (): void => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    frame.current = undefined
    x.stop()
  }

  const glide = (velocity: number): void => {
    let v = velocity
    let last = performance.now()
    const tick = (now: number): void => {
      const next = glideStep(x.get(), v, Math.min(32, now - last), min, 0)
      last = now
      x.set(next.offset)
      v = next.velocity
      frame.current = v === 0 ? undefined : requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }

  const settle = (target: number): void => {
    const to = clamp(target, min, 0)
    if (reduced) x.set(to)
    else void animate(x, to, { type: 'spring', stiffness: 170, damping: 26 })
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (gesture.current) return
    stop()
    suppressClick.current = false
    gesture.current = { id: e.pointerId, startX: e.clientX, startOffset: x.get(), samples: [{ x: e.clientX, t: e.timeStamp }], moved: false }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    const dx = e.clientX - g.startX
    if (!g.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return
    if (!g.moved) e.currentTarget.setPointerCapture?.(e.pointerId)
    g.moved = true
    g.samples = pushSample(g.samples, { x: e.clientX, t: e.timeStamp })
    x.set(rubberBand(g.startOffset + dx, min, 0))
    setEdges((s) => (s.direction === Math.sign(-dx) ? s : { ...s, direction: Math.sign(-dx) }))
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    gesture.current = undefined
    if (!g.moved) return
    suppressClick.current = true
    const velocity = releaseVelocity(pushSample(g.samples, { x: e.clientX, t: e.timeStamp }))
    const now = x.get()
    if (now > 0 || now < min || reduced || velocity === 0) settle(now)
    else glide(velocity)
  }

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (gesture.current?.id !== e.pointerId) return
    gesture.current = undefined
    settle(x.get())
  }

  // A drag that started on a building must not open it.
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!suppressClick.current) return
    suppressClick.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  const step = (dir: 1 | -1): void => {
    stop()
    setEdges((s) => ({ ...s, direction: dir }))
    settle(x.get() - dir * viewport * 0.7)
  }

  const centreOn = (streetX: number): void => {
    stop()
    settle(offsetToCentre(streetX, viewport, min, 0))
  }

  return { x, viewportRef, viewport, min, direction: edges.direction, atStart: edges.atStart, atEnd: edges.atEnd, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture }, step, centreOn }
}
