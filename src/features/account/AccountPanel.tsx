import { useEffect, useState } from 'react'
import { useProgress } from '../../core/progress/store'
import { useAccount } from '../../core/sync/accountStore'
import { Button } from '../../ui/Button'
import { ChangePasswordForm, DeleteAccountForm } from './AccountSettings'
import { chipFor, notSentText, sinceText, type Chip } from './accountText'

const TONES: Record<Chip['tone'], string> = {
  ok: 'bg-ok text-white',
  busy: 'bg-cel text-ink',
  warn: 'bg-sol text-punk',
  muted: 'bg-white text-ink/70',
}

/** Re-renders every 30 s so "fa 2 minuts" stays true. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

function PlayersStatus() {
  const players = useProgress((s) => s.players)
  const states = useAccount((s) => s.players)
  if (players.length === 0) return null
  return (
    <ul aria-label="Estat de cada jugador" className="flex flex-col gap-2">
      {players.map((p) => {
        const state = states[p.id]
        const chip = chipFor(state)
        const notSent = (state?.skipped ?? 0) + (state?.quarantined ?? 0)
        return (
          <li key={p.id} className="flex flex-col gap-1 rounded-2xl bg-brand-soft px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-xl font-bold text-brand-dark">{p.name}</span>
              <span className={`min-w-32 shrink-0 rounded-full px-3 py-1 text-center text-base font-bold ${TONES[chip.tone]}`}>{chip.label}</span>
            </div>
            {state?.state === 'error' && state.message && <p className="text-base text-ink/80">{state.message}</p>}
            {state?.state === 'detached' && <p className="text-base text-ink/80">S’ha esborrat del compte des d’un altre dispositiu. El progrés es manté aquí.</p>}
            {notSent > 0 && <p className="text-base text-ink/80">{notSentText(notSent)}</p>}
          </li>
        )
      })}
    </ul>
  )
}

type Open = 'none' | 'password' | 'delete'

/** Logged in (or logged in but offline): who, when it last synced, each player, and the account actions. */
export function AccountPanel() {
  const email = useAccount((s) => s.email)
  const status = useAccount((s) => s.status)
  const lastSyncAt = useAccount((s) => s.lastSyncAt)
  const syncing = useAccount((s) => s.syncing)
  const message = useAccount((s) => s.message)
  const [open, setOpen] = useState<Open>('none')
  const now = useNow()

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg text-ink">
        Heu entrat com a <strong className="break-all">{email}</strong>
      </p>
      <p className="min-h-7 text-lg text-ink/80" aria-live="polite">
        {status === 'offline'
          ? 'Sense connexió ara mateix: es sincronitzarà sol quan torni.'
          : lastSyncAt
            ? `Última sincronització: ${sinceText(lastSyncAt, now)}.`
            : 'Encara no s’ha sincronitzat en aquesta sessió.'}
      </p>
      {message && status !== 'offline' && <p className="rounded-2xl bg-sol/50 px-4 py-2 text-base font-semibold text-ink">{message}</p>}
      <PlayersStatus />
      <div className="flex flex-wrap gap-2">
        <Button disabled={syncing} onClick={() => void useAccount.getState().syncNow()}>
          Sincronitza ara
        </Button>
        <Button variant="soft" onClick={() => void useAccount.getState().logout()}>
          Surt
        </Button>
      </div>
      <p className="text-base text-ink/70">En sortir, el progrés continua en aquest dispositiu; només deixa de sincronitzar-se.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" aria-expanded={open === 'password'} onClick={() => setOpen(open === 'password' ? 'none' : 'password')}>
          Canvia la contrasenya
        </Button>
        <Button variant="ghost" className="text-punk" aria-expanded={open === 'delete'} onClick={() => setOpen(open === 'delete' ? 'none' : 'delete')}>
          Esborra el compte
        </Button>
      </div>
      {open === 'password' && <ChangePasswordForm onClose={() => setOpen('none')} />}
      {open === 'delete' && <DeleteAccountForm onClose={() => setOpen('none')} />}
      <a href="/api/account/export" download="mates-magiques-compte.json" className="text-lg font-semibold text-brand-dark underline underline-offset-4">
        Descarrega les dades del compte (JSON)
      </a>
    </div>
  )
}
