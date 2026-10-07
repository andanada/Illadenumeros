import { useState } from 'react'
import { exportProgress, serializeBackup } from '../../core/storage/backup'
import { db } from '../../core/storage/db'
import { backupIsDue, setLastBackupAt } from '../../core/storage/meta'
import { Button } from '../../ui/Button'
import { Card, type Message } from './Card'
import { formatDate } from './familyText'
import { backupFilename, type SaveFile } from './saveFile'

export interface BackupSectionProps {
  now: () => number
  saveFile: SaveFile
  /** undefined while loading; null when no copy was ever saved. */
  lastBackupAt: number | null | undefined
  onSaved: (at: number) => void
  onMessage: (message: Message) => void
}

function Reminder({ lastBackupAt }: { lastBackupAt: number | null }) {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  return (
    <div role="note" className="flex flex-col gap-3 rounded-2xl bg-sol/60 p-4 text-lg font-semibold text-ink">
      <p>{lastBackupAt === null ? 'Encara no has desat cap còpia del progrés.' : `Fa més de 14 dies de l’última còpia (${formatDate(lastBackupAt)}).`}</p>
      <p>Desar-ne una de tant en tant evita perdre el progrés si es canvia o s’esborra el navegador.</p>
      <Button variant="soft" className="self-end" onClick={() => setHidden(true)}>
        D’acord
      </Button>
    </div>
  )
}

export function BackupSection({ now, saveFile, lastBackupAt, onSaved, onMessage }: BackupSectionProps) {
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      const at = now()
      const blob = new Blob([serializeBackup(await exportProgress(() => at))], { type: 'application/json' })
      const outcome = await saveFile(blob, backupFilename(at))
      if (outcome !== 'cancelled') {
        await setLastBackupAt(db, at)
        onSaved(at)
        onMessage({ kind: 'ok', text: 'Còpia desada. Guarda-la en un lloc segur (Fitxers, correu, ordinador…).' })
      }
    } catch {
      onMessage({ kind: 'error', text: 'No s’ha pogut crear la còpia. Torna-ho a provar.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Còpia de seguretat" tilt={-0.6}>
      {lastBackupAt !== undefined && backupIsDue(lastBackupAt ?? undefined, now()) && <Reminder lastBackupAt={lastBackupAt} />}
      {lastBackupAt != null && <p className="text-lg text-ink/80">Última còpia: {formatDate(lastBackupAt)}</p>}
      <Button className="w-full" disabled={busy} onClick={() => void save()}>
        Desa una còpia del progrés
      </Button>
      <p className="text-base text-ink/70">Es desa un fitxer petit amb tot el progrés. A l’iPad el pots enviar a Fitxers o per AirDrop.</p>
    </Card>
  )
}
