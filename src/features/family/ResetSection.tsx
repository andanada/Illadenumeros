import { useId, useState } from 'react'
import { useProgress } from '../../core/progress/store'
import { Button } from '../../ui/Button'
import { Card, type Message } from './Card'
import { sameName } from './familyText'

export interface ResetSectionProps {
  childName: string
  onDone: () => void
  onMessage: (message: Message) => void
}

/** Two steps: open the confirmation, then type the child's name to enable the final button. */
export function ResetSection({ childName, onDone, onMessage }: ResetSectionProps) {
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const confirmed = sameName(typed, childName)

  const erase = async () => {
    if (!confirmed) return
    setBusy(true)
    const ok = await useProgress.getState().resetAll()
    setBusy(false)
    if (ok) onDone()
    else onMessage({ kind: 'error', text: 'No s’ha pogut esborrar. El progrés continua desat.' })
  }

  return (
    <Card title="Començar de zero" tilt={-0.4}>
      {!open ? (
        <Button variant="soft" className="w-full text-punk" onClick={() => setOpen(true)}>
          Esborra tot el progrés
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold text-punk">
            S’esborraran el perfil, les habilitats, els pètals i les pegatines d’aquest dispositiu. No es pot desfer: desa abans una còpia si en vols conservar el progrés.
          </p>
          <label htmlFor={inputId} className="text-lg font-semibold text-ink">
            Escriu «{childName}» per confirmar
          </label>
          <input
            id={inputId}
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            className="min-h-16 rounded-2xl border-4 border-punk/40 bg-white px-4 text-2xl font-bold text-ink focus:border-punk focus:outline-none"
          />
          <Button variant="punk" disabled={!confirmed || busy} onClick={() => void erase()}>
            Sí, esborra-ho tot
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false)
              setTyped('')
            }}
          >
            No, deixa-ho estar
          </Button>
        </div>
      )}
    </Card>
  )
}
