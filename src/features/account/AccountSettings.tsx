import { useState } from 'react'
import { useAccount } from '../../core/sync/accountStore'
import { Button } from '../../ui/Button'
import { MIN_PASSWORD } from './accountText'
import { PasswordField } from './PasswordField'

type Feedback = { kind: 'ok' | 'error'; text: string } | undefined

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  return feedback.kind === 'ok' ? (
    <p role="status" className="rounded-2xl bg-ok px-4 py-3 text-lg font-bold text-white">
      {feedback.text}
    </p>
  ) : (
    <p role="alert" className="rounded-2xl bg-sol/60 px-4 py-3 text-lg font-semibold text-punk">
      {feedback.text}
    </p>
  )
}

export function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>()

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (next.length < MIN_PASSWORD) return setFeedback({ kind: 'error', text: `La contrasenya nova ha de tenir almenys ${MIN_PASSWORD} caràcters.` })
    setBusy(true)
    const result = await useAccount.getState().changePassword(current, next)
    setBusy(false)
    if (!result.ok) return setFeedback({ kind: 'error', text: result.message })
    setCurrent('')
    setNext('')
    setFeedback({ kind: 'ok', text: 'Contrasenya canviada. Els altres dispositius hauran de tornar a entrar.' })
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3 rounded-2xl bg-brand-soft p-4">
      <PasswordField label="Contrasenya actual" value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordField label="Contrasenya nova" value={next} onChange={setNext} autoComplete="new-password" />
      <p className="text-base text-ink/70">Almenys {MIN_PASSWORD} caràcters i no una contrasenya habitual.</p>
      <FeedbackLine feedback={feedback} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || current === '' || next === ''}>
          Desa la contrasenya nova
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Tanca
        </Button>
      </div>
    </form>
  )
}

/** Two steps: an explanation + "yes", then the password and the final button. */
export function DeleteAccountForm({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>()

  const erase = async () => {
    setBusy(true)
    const result = await useAccount.getState().deleteAccount(password)
    setBusy(false)
    if (!result.ok) setFeedback({ kind: 'error', text: result.message })
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-sol/40 p-4">
      <p className="text-lg font-semibold text-ink">
        S’esborrarà el compte i totes les dades guardades al servidor (de tots els jugadors). El progrés es manté en aquest dispositiu, i també als altres dispositius que ja el tinguin. No es pot desfer.
      </p>
      {step === 1 ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="punk" onClick={() => setStep(2)}>
            Sí, vull esborrar el compte
          </Button>
          <Button variant="ghost" onClick={onClose}>
            No, deixa-ho estar
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void erase()
          }}
        >
          <PasswordField label="Contrasenya del compte" value={password} onChange={setPassword} autoComplete="current-password" />
          <FeedbackLine feedback={feedback} />
          <Button type="submit" variant="punk" disabled={busy || password === ''}>
            Esborra el compte definitivament
          </Button>
          <Button variant="ghost" onClick={onClose}>
            No, deixa-ho estar
          </Button>
        </form>
      )}
    </div>
  )
}
