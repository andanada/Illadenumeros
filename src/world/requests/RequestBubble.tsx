import { motion } from 'motion/react'
import { useWorldReducedMotion } from '../scene/useReducedMotion'
import type { RequestKind } from './types'

const ICON: Readonly<Record<RequestKind, string>> = {
  cook: '🍳',
  serve: '🛒',
  give: '🎁',
  drive: '🚌',
  style: '✂️',
  play: '🕹️',
}

export interface RequestBubbleProps {
  kind: RequestKind
  /** Shown as a small number when more than one need is waiting. */
  count?: number
  /** 'calm' = sleepy, dimmed; it wakes when tapped. */
  state?: 'waiting' | 'calm'
  label?: string
  /** Gets the bubble element (to know where it is on screen). */
  onActivate?: (el: HTMLElement) => void
  /** Hidden from assistive tech (the building's own button already says it all). */
  decorative?: boolean
  className?: string
}

/**
 * A small speech bubble with the verb's icon (and a number when several wait). Always ignorable: it is
 * a hint, never a gate. A local stand-in for the sandbox `<Anchor/>`, which will replace it.
 */
export function RequestBubble({ kind, count = 1, state = 'waiting', label, onActivate, decorative = false, className = '' }: RequestBubbleProps) {
  const reduced = useWorldReducedMotion()
  const calm = state === 'calm'
  return (
    <motion.span
      role={onActivate && !decorative ? 'button' : undefined}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      data-request-bubble={kind}
      data-state={state}
      onClick={
        onActivate
          ? (e) => {
              e.stopPropagation()
              onActivate(e.currentTarget)
            }
          : undefined
      }
      initial={reduced ? false : { scale: 0.4, opacity: 0 }}
      animate={reduced || calm ? { scale: 1, opacity: calm ? 0.55 : 1 } : { scale: 1, opacity: 1, y: [0, -6, 0] }}
      transition={reduced || calm ? { duration: 0 } : { scale: { type: 'spring', stiffness: 380, damping: 16 }, y: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } }}
      className={`relative inline-flex min-h-14 min-w-14 items-center justify-center gap-1 rounded-[1.6rem] bg-white px-3 text-3xl shadow-[var(--world-shadow-lift)] ${className}`}
    >
      <span aria-hidden="true">{calm ? '💤' : ICON[kind]}</span>
      {!calm && count > 1 && <span className="text-2xl font-bold text-[var(--world-ink,#2b2440)]">{count}</span>}
      <span aria-hidden="true" className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 rounded-sm bg-white" />
    </motion.span>
  )
}
