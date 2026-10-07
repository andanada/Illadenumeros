import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgress } from '../../core/progress/store'
import { Button } from '../../ui/Button'
import { Screen } from '../../ui/Screen'
import { AdultGate } from '../family/AdultGate'
import { AccountSection } from './AccountSection'

export interface AccountPageProps {
  /** Seed of the adult check; injected in tests. */
  seed?: string
}

/**
 * `/compte`: the family account on a device that has no player yet (a new tablet), so the adult can
 * log in and get the players of the account. Behind the same adult check as the family page.
 */
export default function AccountPage({ seed }: AccountPageProps) {
  const navigate = useNavigate()
  const [gateSeed] = useState(() => seed ?? crypto.randomUUID())
  const [passed, setPassed] = useState(false)
  const playerCount = useProgress((s) => s.players.length)

  if (!passed) return <AdultGate seed={gateSeed} onPass={() => setPassed(true)} onCancel={() => navigate('/', { replace: true })} />

  return (
    <Screen title="Compte de la família" back="/">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
        <AccountSection />
        {playerCount > 0 && (
          <Button big className="w-full" onClick={() => navigate('/', { replace: true })}>
            Tria qui juga
          </Button>
        )}
      </div>
    </Screen>
  )
}
