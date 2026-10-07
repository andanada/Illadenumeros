import { useAccount } from '../../core/sync/accountStore'
import { Button } from '../../ui/Button'
import { Card } from '../family/Card'
import { AccountPanel } from './AccountPanel'
import { AuthForms } from './AuthForms'

function Intro() {
  return (
    <div className="flex flex-col gap-2 text-lg leading-snug text-ink">
      <p>
        Amb un compte de la família, el progrés de cada jugador es copia al servidor de la família i es pot continuar en un altre dispositiu (per exemple, la tauleta i l’ordinador).
      </p>
      <p>L’app funciona igual sense compte: tot es queda en aquest dispositiu. Mai no s’atura el joc per culpa de la connexió.</p>
      <p className="text-base text-ink/70">Només es guarda el correu de l’adult, el nom de pila, el personatge, el color i el progrés. Cap anunci ni seguiment.</p>
    </div>
  )
}

/** "Compte de la família" on the adults' page: create / log into the family account and see the sync. */
export function AccountSection() {
  const status = useAccount((s) => s.status)
  const email = useAccount((s) => s.email)
  const message = useAccount((s) => s.message)

  return (
    <Card title="Compte de la família" tilt={0.5}>
      {status === 'unknown' && <p className="text-lg text-ink/80">Comprovant el compte…</p>}
      {(status === 'loggedIn' || (status === 'offline' && email)) && <AccountPanel />}
      {status === 'offline' && !email && (
        <div className="flex flex-col gap-3">
          <p className="text-lg text-ink">Sense connexió: ara no es pot comprovar el compte. El joc continua funcionant igual.</p>
          <Button variant="soft" onClick={() => void useAccount.getState().restore()}>
            Torna-ho a provar
          </Button>
        </div>
      )}
      {status === 'loggedOut' && (
        <>
          {message && <p className="rounded-2xl bg-sol/50 px-4 py-2 text-base font-semibold text-ink">{message}</p>}
          <Intro />
          <AuthForms />
        </>
      )}
    </Card>
  )
}
