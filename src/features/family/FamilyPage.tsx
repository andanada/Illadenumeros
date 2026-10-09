import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgress } from '../../core/progress/store'
import { SCHEMA_VERSION } from '../../core/storage/db'
import { getDb } from '../../core/storage/playerDbs'
import { readMeta } from '../../core/storage/meta'
import { useAccount } from '../../core/sync/accountStore'
import { Screen } from '../../ui/Screen'
import { AccountSection } from '../account/AccountSection'
import { APP_VERSION } from './appVersion'
import { BackupSection } from './BackupSection'
import { Card, MessageBar, type Message } from './Card'
import { PlayersSection } from './PlayersSection'
import { ResetSection } from './ResetSection'
import { RestoreSection } from './RestoreSection'
import { createSaveFile, type SaveFile } from './saveFile'

export interface FamilyPageProps {
  /** Injected in tests; by default shares (iPad) or downloads the file. */
  saveFile?: SaveFile
  now?: () => number
}

function ProgressSummary() {
  const rewards = useProgress((s) => s.rewards)
  const skillStates = useProgress((s) => s.skillStates)
  const mastered = useMemo(() => Object.values(skillStates).filter((s) => s.status === 'dominada').length, [skillStates])
  const rows: [string, number][] = [
    ['Dies jugats', rewards.daysPlayed.length],
    ['Pètals', rewards.petals],
    ['Habilitats dominades', mastered],
  ]
  return (
    <ul aria-label="Resum del progrés" className="grid grid-cols-3 gap-3 text-center">
      {rows.map(([label, value]) => (
        <li key={label} className="flex flex-col justify-center rounded-2xl bg-brand/10 p-3">
          <span className="text-base font-semibold leading-tight text-ink/70">{label}</span>
          <span className="text-3xl font-bold text-brand-dark">{value}</span>
        </li>
      ))}
    </ul>
  )
}

/** Where the progress lives: only here, or here + the family account. */
function StorageExplanation() {
  const cloud = useAccount((s) => s.status === 'loggedIn' || s.status === 'offline')
  return (
    <p className="text-lg leading-snug text-ink">
      {cloud ? (
        <>
          El progrés de cada jugador es guarda en aquest dispositiu, separat del dels altres, i com que heu entrat al compte de la família també se’n desa una còpia al servidor de la
          família, que es comparteix amb els vostres altres dispositius.
        </>
      ) : (
        <>
          El progrés de cada jugador es guarda només en aquest dispositiu, dins del navegador, separat del dels altres. No s’envia enlloc si no entreu al compte de la família.
          Si s’esborren les dades del navegador o es canvia de dispositiu, només es pot recuperar amb una còpia.
        </>
      )}
    </p>
  )
}

/** Calm, adult-only screen: where the progress lives, backup, restore and a safe reset. */
export default function FamilyPage({ saveFile, now = Date.now }: FamilyPageProps) {
  const navigate = useNavigate()
  const profile = useProgress((s) => s.profile)
  const hasLocalProgress = useProgress((s) => s.profile !== undefined || Object.keys(s.skillStates).length > 0)
  const [message, setMessage] = useState<Message>()
  const [lastBackupAt, setLastBackupAt] = useState<number | null>()
  const save = useMemo(() => saveFile ?? createSaveFile(), [saveFile])

  const activePlayerId = useProgress((s) => s.activePlayerId)
  const cloud = useAccount((s) => s.status === 'loggedIn' || s.status === 'offline')

  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(() => readMeta(getDb()))
      .then((meta) => active && setLastBackupAt(meta.lastBackupAt ?? null))
      .catch(() => active && setLastBackupAt(null))
    return () => {
      active = false
    }
  }, [activePlayerId])

  return (
    <Screen title="Per a la família" back="/poble">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
        <Card title="On es guarda el progrés" tilt={0.4}>
          <StorageExplanation />
          <ProgressSummary />
          <button
            type="button"
            onClick={() => navigate('/progres')}
            className="min-h-14 rounded-2xl bg-brand px-5 py-3 text-xl font-bold text-white shadow-md"
          >
            Veure el progrés detallat
          </button>
        </Card>

        <MessageBar message={message} />

        <AccountSection />

        <PlayersSection
          onDeleted={(wasActive, remaining) => {
            if (remaining === 0) navigate('/start', { replace: true })
            else if (wasActive) navigate('/qui-juga', { replace: true })
            else setMessage({ kind: 'ok', text: cloud ? 'Jugador esborrat d’aquest dispositiu i del compte.' : 'Jugador esborrat d’aquest dispositiu.' })
          }}
        />

        <BackupSection childName={profile?.name} now={now} saveFile={save} lastBackupAt={lastBackupAt} onSaved={setLastBackupAt} onMessage={setMessage} />
        <RestoreSection childName={profile?.name} hasLocalProgress={hasLocalProgress} onMessage={setMessage} />
        {profile && <ResetSection childName={profile.name} onDone={() => navigate('/', { replace: true })} onMessage={setMessage} />}

        <p className="text-center text-base text-ink/60">
          Versió de l’app {APP_VERSION} · dades v{SCHEMA_VERSION}
        </p>
      </div>
    </Screen>
  )
}
