import { useId, useState } from 'react'
import { importProgress, readBackup, type BackupSummary, type ImportStrategy } from '../../core/storage/backup'
import { Button } from '../../ui/Button'
import { Card, type Message } from './Card'
import { formatDate } from './familyText'

interface Pending {
  file: File
  summary: BackupSummary
  skipped: number
}

export interface RestoreSectionProps {
  /** Name of the active player, who receives the copy. */
  childName: string | undefined
  hasLocalProgress: boolean
  onMessage: (message: Message | undefined) => void
}

function Preview({ pending, hasLocalProgress, busy, onApply, onCancel }: {
  pending: Pending
  hasLocalProgress: boolean
  busy: boolean
  onApply: (strategy: ImportStrategy) => void
  onCancel: () => void
}) {
  const { summary, skipped } = pending
  const rows: [string, number][] = [
    ['Habilitats', summary.skills],
    ['Fets numèrics', summary.facts],
    ['Respostes', summary.attempts],
  ]
  return (
    <section aria-label="Còpia trobada" className="flex flex-col gap-3 rounded-2xl bg-brand/10 p-4">
      <p className="text-xl font-bold text-ink">
        Còpia {summary.childName ? `de ${summary.childName}` : 'sense perfil'}, desada el {formatDate(summary.exportedAt)}
      </p>
      <ul className="grid grid-cols-3 gap-2 text-center">
        {rows.map(([label, value]) => (
          <li key={label} className="flex flex-col rounded-xl bg-white p-2">
            <span className="text-base text-ink/70">{label}</span>
            <span className="text-2xl font-bold text-brand-dark">{value}</span>
          </li>
        ))}
      </ul>
      {skipped > 0 && <p className="text-base font-semibold text-punk">Hi ha {skipped} dades malmeses que no es recuperaran.</p>}
      {hasLocalProgress ? (
        <>
          <p className="text-lg text-ink">Aquest dispositiu ja té progrés. Com vols recuperar la còpia?</p>
          <Button variant="punk" disabled={busy} onClick={() => onApply('replace')}>
            Substitueix el progrés d’aquest dispositiu
          </Button>
          <Button variant="soft" disabled={busy} onClick={() => onApply('keep-newer')}>
            Combina-la i conserva el més recent
          </Button>
        </>
      ) : (
        <Button disabled={busy} onClick={() => onApply('replace')}>
          Recupera aquesta còpia
        </Button>
      )}
      <Button variant="ghost" disabled={busy} onClick={onCancel}>
        Cancel·la
      </Button>
    </section>
  )
}

export function RestoreSection({ childName, hasLocalProgress, onMessage }: RestoreSectionProps) {
  const inputId = useId()
  const [pending, setPending] = useState<Pending>()
  const [busy, setBusy] = useState(false)

  const pick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    onMessage(undefined)
    const read = await readBackup(file)
    if (!read.ok) {
      setPending(undefined)
      onMessage({ kind: 'error', text: read.error })
      return
    }
    setPending({ file, summary: read.summary, skipped: read.skipped })
  }

  const apply = async (strategy: ImportStrategy) => {
    if (!pending) return
    setBusy(true)
    const result = await importProgress(pending.file, { strategy })
    setBusy(false)
    setPending(undefined)
    if (!result.ok) {
      onMessage({ kind: 'error', text: result.error })
      return
    }
    const note = result.skipped > 0 ? ` (${result.skipped} dades malmeses descartades)` : ''
    onMessage({ kind: 'ok', text: `Còpia recuperada${note}.` })
  }

  return (
    <Card title={childName ? `Recuperar una còpia per a ${childName}` : 'Recuperar una còpia'} tilt={0.5}>
      <p className="text-lg text-ink/80">Tria un fitxer desat abans. Abans d’aplicar-lo veuràs què conté.</p>
      <label
        htmlFor={inputId}
        className="sticker grid min-h-16 cursor-pointer place-items-center rounded-[1.6rem] bg-white px-7 text-center text-2xl font-bold text-brand-dark focus-within:outline-4 focus-within:outline-brand"
      >
        Recupera una còpia
        <input id={inputId} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void pick(e)} />
      </label>
      {pending && (
        <Preview pending={pending} hasLocalProgress={hasLocalProgress} busy={busy} onApply={(s) => void apply(s)} onCancel={() => setPending(undefined)} />
      )}
    </Card>
  )
}
