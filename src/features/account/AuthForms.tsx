import { useId, useState } from 'react'
import { useAccount, type ActionResult } from '../../core/sync/accountStore'
import { Button } from '../../ui/Button'
import { INPUT_CLASS, MIN_PASSWORD } from './accountText'
import { PasswordField } from './PasswordField'

type Mode = 'register' | 'login'

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const option = (value: Mode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={() => onChange(value)}
      className={`min-h-14 flex-1 rounded-2xl px-4 text-xl font-bold ${mode === value ? 'sticker bg-brand text-white' : 'bg-transparent text-brand-dark'}`}
    >
      {label}
    </button>
  )
  return (
    <div role="group" aria-label="Què vols fer?" className="flex gap-2 rounded-[1.4rem] bg-brand-soft p-1">
      {option('register', 'Crea un compte')}
      {option('login', 'Entra')}
    </div>
  )
}

function PasswordRules({ id, password }: { id: string; password: string }) {
  const longEnough = password.length >= MIN_PASSWORD
  return (
    <ul id={id} className="flex flex-col gap-1 text-base text-ink/80">
      <li>
        <span aria-hidden="true">{longEnough ? '✓ ' : '• '}</span>
        Almenys {MIN_PASSWORD} caràcters{password.length > 0 && !longEnough ? ` (ara ${password.length})` : ''}.
      </li>
      <li>
        <span aria-hidden="true">• </span>
        Res de contrasenyes habituals com «1234567890» o «contrasenya». Una frase curta va molt bé.
      </li>
    </ul>
  )
}

/** "Crea un compte" (with invite code) and "Entra". Errors in plain Catalan; nothing is remembered. */
export function AuthForms() {
  const [mode, setMode] = useState<Mode>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const emailId = useId()
  const inviteId = useId()
  const rulesId = useId()

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (mode === 'register' && password.length < MIN_PASSWORD) return setError(`La contrasenya ha de tenir almenys ${MIN_PASSWORD} caràcters.`)
    setBusy(true)
    setError(undefined)
    const { register, login } = useAccount.getState()
    const result: ActionResult = mode === 'register' ? await register(email, password, invite) : await login(email, password)
    setBusy(false)
    if (result.ok) setPassword('')
    else setError(result.message)
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
      <ModeSwitch
        mode={mode}
        onChange={(next) => {
          setMode(next)
          setError(undefined)
        }}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={emailId} className="text-lg font-semibold text-ink">
          Correu electrònic
        </label>
        <input id={emailId} type="email" inputMode="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_CLASS} />
      </div>
      <PasswordField
        label="Contrasenya"
        value={password}
        onChange={setPassword}
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        {...(mode === 'register' ? { describedBy: rulesId } : {})}
      />
      {mode === 'register' && (
        <>
          <PasswordRules id={rulesId} password={password} />
          <div className="flex flex-col gap-1">
            <label htmlFor={inviteId} className="text-lg font-semibold text-ink">
              Codi d’invitació
            </label>
            <input id={inviteId} autoComplete="off" spellCheck={false} maxLength={256} value={invite} onChange={(e) => setInvite(e.target.value)} className={INPUT_CLASS} />
            <p className="text-base text-ink/70">El dona qui gestiona el servidor de la família.</p>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="rounded-2xl bg-sol/60 px-4 py-3 text-lg font-semibold text-punk">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || email.trim() === '' || password === '' || (mode === 'register' && invite.trim() === '')}>
        {mode === 'register' ? 'Crea el compte' : 'Entra al compte'}
      </Button>
    </form>
  )
}
