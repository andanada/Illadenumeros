import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgress } from '../../core/progress/store'
import { db, SCHEMA_VERSION } from '../../core/storage/db'
import { readMeta } from '../../core/storage/meta'
import { Screen } from '../../ui/Screen'
import { APP_VERSION } from './appVersion'
import { BackupSection } from './BackupSection'
import { Card, MessageBar, type Message } from './Card'
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

/** Calm, adult-only screen: where the progress lives, backup, restore and a safe reset. */
export default function FamilyPage({ saveFile, now = Date.now }: FamilyPageProps) {
  const navigate = useNavigate()
  const profile = useProgress((s) => s.profile)
  const hasLocalProgress = useProgress((s) => s.profile !== undefined || Object.keys(s.skillStates).length > 0)
  const [message, setMessage] = useState<Message>()
  const [lastBackupAt, setLastBackupAt] = useState<number | null>()
  const save = useMemo(() => saveFile ?? createSaveFile(), [saveFile])

  useEffect(() => {
    let active = true
    readMeta(db)
      .then((meta) => active && setLastBackupAt(meta.lastBackupAt ?? null))
      .catch(() => active && setLastBackupAt(null))
    return () => {
      active = false
    }
  }, [])

  return (
    <Screen title="Per a la família" back="/map">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
        <Card title="On es guarda el progrés" tilt={0.4}>
          <p className="text-lg leading-snug text-ink">
            El progrés{profile ? ` de ${profile.name}` : ''} es guarda només en aquest dispositiu, dins del navegador. No s’envia enlloc ni hi ha cap compte al núvol.
            Si s’esborren les dades del navegador o es canvia de dispositiu, només es pot recuperar amb una còpia.
          </p>
          <ProgressSummary />
        </Card>

        <MessageBar message={message} />

        <BackupSection now={now} saveFile={save} lastBackupAt={lastBackupAt} onSaved={setLastBackupAt} onMessage={setMessage} />
        <RestoreSection hasLocalProgress={hasLocalProgress} onMessage={setMessage} />
        {profile && <ResetSection childName={profile.name} onDone={() => navigate('/start', { replace: true })} onMessage={setMessage} />}

        <p className="text-center text-base text-ink/60">
          Versió de l’app {APP_VERSION} · dades v{SCHEMA_VERSION}
        </p>
      </div>
    </Screen>
  )
}
