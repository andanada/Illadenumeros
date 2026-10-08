import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface RadioOption {
  id: string
  /** Accessible name (Catalan). */
  label: string
  content: ReactNode
}

export interface RadioGridProps {
  /** Group name read by screen readers, also shown as a small heading. */
  label: string
  options: readonly RadioOption[]
  value: string
  onChange: (id: string) => void
  /** card = picture tile, swatch = colour dot. */
  variant?: 'card' | 'swatch'
  /** Hide the visible heading (the accessible name stays). */
  hideLabel?: boolean
}

const NEXT: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/**
 * WAI-ARIA radio group: one tab stop (roving tabindex), arrows move and select, Home/End jump.
 * Every option is at least 64 × 64 px.
 */
export function RadioGrid({ label, options, value, onChange, variant = 'card', hideLabel = false }: RadioGridProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const current = Math.max(0, options.findIndex((o) => o.id === value))

  const select = (index: number) => {
    const n = options.length
    const i = ((index % n) + n) % n
    const option = options[i]
    if (!option) return
    onChange(option.id)
    refs.current[i]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = NEXT[e.key]
    if (step !== undefined) {
      e.preventDefault()
      select(current + step)
    } else if (e.key === 'Home') {
      e.preventDefault()
      select(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      select(options.length - 1)
    }
  }

  const headingId = useId()
  const swatch = variant === 'swatch'
  return (
    <div className="flex flex-col gap-2">
      <p id={headingId} className={hideLabel ? 'sr-only' : 'px-1 text-sm font-semibold uppercase tracking-wider text-[var(--world-text-soft)]'}>
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={headingId}
        onKeyDown={onKeyDown}
        className={swatch ? 'flex flex-wrap gap-3' : 'grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-3'}
      >
        {options.map((o, i) => {
          const checked = i === current && o.id === value
          return (
            <button
              key={o.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={o.label}
              title={o.label}
              tabIndex={i === current ? 0 : -1}
              onClick={() => select(i)}
              className={
                swatch
                  ? 'world-chip grid size-16 shrink-0 place-items-center rounded-full! p-1.5'
                  : 'world-chip grid min-h-[84px] min-w-16 place-items-center overflow-hidden p-1'
              }
            >
              {o.content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
