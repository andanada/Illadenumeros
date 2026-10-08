import { useCallback, useEffect, useRef, useState } from 'react'

/** A wrong guess stays in its slot this long, then goes back to the tray. */
export const RETURN_MS = 1100

export interface GuessSlot {
  /** Value currently shown in the hidden slot, if any. */
  guess: number | null
  /** Shows a guess; when it is wrong it is given back after RETURN_MS. */
  put: (value: number, right: boolean) => void
}

/** Shared "try a number in the gap" behaviour: right guesses stay, wrong ones are returned kindly. */
export function useGuessSlot(): GuessSlot {
  const [guess, setGuess] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const put = useCallback((value: number, right: boolean): void => {
    setGuess(value)
    if (!right) timer.current = setTimeout(() => setGuess(null), RETURN_MS)
  }, [])
  return { guess, put }
}
