import { useEffect, useRef, type RefObject } from 'react'
import { digitFromKey, matchTyped } from './typedAnswer'

const COMMIT_MS = 800
const FORWARD = ['ArrowRight', 'ArrowDown']
const BACKWARD = ['ArrowLeft', 'ArrowUp']

interface Options {
  /** Answer values currently on screen. */
  values: readonly string[]
  enabled: boolean
  onPick: (value: string) => void
  /** Element that holds the answer buttons (arrows move the focus between them; Enter is the button itself). */
  containerRef: RefObject<HTMLElement | null>
}

function moveFocus(container: HTMLElement | null, step: 1 | -1): void {
  const buttons = Array.from(container?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])
  if (buttons.length === 0) return
  const at = buttons.findIndex((b) => b === document.activeElement)
  const next = at === -1 ? (step === 1 ? 0 : buttons.length - 1) : (at + step + buttons.length) % buttons.length
  buttons[next]?.focus()
}

/** Keyboard play: type the number (1-2 digits) to answer, arrows to move between answers, Enter to choose. */
export function useAnswerKeys({ values, enabled, onPick, containerRef }: Options): void {
  const latest = useRef({ values, onPick })
  const buffer = useRef('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    latest.current = { values, onPick }
    buffer.current = ''
  }, [values, onPick])

  useEffect(() => {
    if (!enabled) return
    const reset = (): void => {
      buffer.current = ''
      clearTimeout(timer.current)
    }
    const commit = (value: string): void => {
      reset()
      latest.current.onPick(value)
    }
    const typed = (digit: string): void => {
      const { values: shown } = latest.current
      buffer.current = (buffer.current + digit).slice(-2)
      let match = matchTyped(buffer.current, shown)
      if (match.kind === 'none') {
        buffer.current = digit
        match = matchTyped(digit, shown)
      }
      clearTimeout(timer.current)
      if (match.kind === 'pick') commit(match.value)
      else if (match.kind === 'wait') {
        const pending = match.value
        timer.current = setTimeout(() => (pending !== undefined ? commit(pending) : reset()), COMMIT_MS)
      } else reset()
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      const digit = digitFromKey(event.key)
      if (digit !== undefined) {
        typed(digit)
      } else if (FORWARD.includes(event.key) || BACKWARD.includes(event.key)) {
        event.preventDefault()
        moveFocus(containerRef.current, FORWARD.includes(event.key) ? 1 : -1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      reset()
    }
  }, [enabled, containerRef])
}
