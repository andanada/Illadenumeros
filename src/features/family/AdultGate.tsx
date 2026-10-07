import { useId, useMemo, useState } from 'react'
import { Button } from '../../ui/Button'
import { createAdultCheck, isAdultAnswer } from './adultCheck'

export interface AdultGateProps {
  /** Seed of the first multiplication; each wrong answer moves to `${seed}-1`, `${seed}-2`… */
  seed: string
  onPass: () => void
  onCancel: () => void
}

/** Small adult check in front of the family page: type the result of a multiplication. */
export function AdultGate({ seed, onPass, onCancel }: AdultGateProps) {
  const titleId = useId()
  const [round, setRound] = useState(0)
  const [value, setValue] = useState('')
  const [missed, setMissed] = useState(false)
  const check = useMemo(() => createAdultCheck(round === 0 ? seed : `${seed}-${round}`), [seed, round])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (isAdultAnswer(check, value)) {
      onPass()
      return
    }
    setMissed(true)
    setValue('')
    setRound((r) => r + 1)
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="sticker notebook w-full max-w-md -rotate-1 rounded-[2rem] bg-white p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-3xl font-bold tracking-tight text-brand-dark">
            Només per a adults
          </h2>
          <button
            type="button"
            aria-label="Tanca"
            onClick={onCancel}
            className="sticker grid size-12 shrink-0 place-items-center rounded-full bg-white text-2xl"
          >
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <label htmlFor={`${titleId}-answer`} className="text-xl font-semibold text-ink">
            Per entrar, escriu el resultat de:
          </label>
          <p aria-live="polite" className="sticker rotate-1 self-center rounded-2xl bg-sol px-6 py-3 text-4xl font-bold text-ink">
            {check.prompt}
          </p>
          <input
            id={`${titleId}-answer`}
            aria-label="Resultat"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="min-h-16 rounded-2xl border-4 border-brand/40 bg-white px-4 text-center text-3xl font-bold text-ink focus:border-brand focus:outline-none"
          />
          <p role="status" className="min-h-7 text-center text-lg font-semibold text-brand-dark">
            {missed ? 'Aquesta no és. Prova amb aquesta altra.' : ''}
          </p>
          <Button type="submit" className="w-full">
            Entra
          </Button>
        </form>
      </div>
    </div>
  )
}
