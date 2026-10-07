import { useId, useState } from 'react'
import type { PlayerSummary } from '../../core/progress/store'
import { Button } from '../../ui/Button'
import { Mascot } from '../../ui/mascot/Mascot'
import { validateName } from '../onboarding/nameSchema'
import { sameName } from './familyText'

export interface PlayerRowProps {
  player: PlayerSummary
  active: boolean
  onRename: (name: string) => Promise<boolean>
  onDelete: () => Promise<boolean>
}

type Mode = 'view' | 'rename' | 'delete'

function RenameForm({ player, onRename, onClose }: { player: PlayerSummary; onRename: PlayerRowProps['onRename']; onClose: () => void }) {
  const inputId = useId()
  const [value, setValue] = useState(player.name)
  const [error, setError] = useState<string>()
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const check = validateName(value)
    if (!check.ok) return setError(check.message)
    if (await onRename(check.name)) onClose()
    else setError('No s’ha pogut canviar el nom.')
  }
  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-lg font-semibold text-ink">
        Nou nom de {player.name}
      </label>
      <input
        id={inputId}
        value={value}
        maxLength={20}
        autoComplete="off"
        aria-invalid={error !== undefined}
        onChange={(e) => {
          setValue(e.target.value)
          setError(undefined)
        }}
        className="min-h-16 rounded-2xl border-4 border-brand/40 bg-white px-4 text-2xl font-bold text-ink focus:border-brand focus:outline-none"
      />
      {error && (
        <p role="alert" className="text-lg font-semibold text-punk">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Desa el nom</Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel·la
        </Button>
      </div>
    </form>
  )
}

function DeleteConfirm({ player, onDelete, onClose }: { player: PlayerSummary; onDelete: PlayerRowProps['onDelete']; onClose: () => void }) {
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const confirmed = sameName(typed, player.name)
  const erase = async () => {
    if (!confirmed) return
    setBusy(true)
    const ok = await onDelete()
    setBusy(false)
    setFailed(!ok)
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg font-semibold text-punk">
        S’esborrarà {player.name} i tot el seu progrés (habilitats, pètals i pegatines), només d’aquest dispositiu. Els altres jugadors no es toquen. No es pot desfer.
      </p>
      <label htmlFor={inputId} className="text-lg font-semibold text-ink">
        Escriu «{player.name}» per confirmar
      </label>
      <input
        id={inputId}
        autoComplete="off"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        className="min-h-16 rounded-2xl border-4 border-punk/40 bg-white px-4 text-2xl font-bold text-ink focus:border-punk focus:outline-none"
      />
      {failed && (
        <p role="alert" className="text-lg font-semibold text-punk">
          No s’ha pogut esborrar. El progrés continua desat.
        </p>
      )}
      <Button variant="punk" disabled={!confirmed || busy} onClick={() => void erase()}>
        Sí, esborra {player.name}
      </Button>
      <Button variant="ghost" onClick={onClose}>
        No, deixa-ho estar
      </Button>
    </div>
  )
}

/** One player of the family page: name and character, with rename and a double-confirmed delete. */
export function PlayerRow({ player, active, onRename, onDelete }: PlayerRowProps) {
  const [mode, setMode] = useState<Mode>('view')
  const close = () => setMode('view')
  return (
    <li data-theme={player.color} className="flex flex-col gap-3 rounded-2xl bg-brand-soft p-3">
      <div className="flex items-center gap-3">
        <Mascot character={player.character} mood="pensa" size={56} />
        <p className="min-w-0 flex-1 truncate text-2xl font-bold text-brand-dark">
          <span>{player.name}</span>
          {active && <span className="ml-2 rounded-full bg-white px-3 py-1 text-base font-semibold text-ink">juga ara</span>}
        </p>
      </div>
      {mode === 'view' && (
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" aria-label={`Canvia el nom de ${player.name}`} onClick={() => setMode('rename')}>
            Canvia el nom
          </Button>
          <Button variant="ghost" className="text-punk" aria-label={`Esborra ${player.name}`} onClick={() => setMode('delete')}>
            Esborra
          </Button>
        </div>
      )}
      {mode === 'rename' && <RenameForm player={player} onRename={onRename} onClose={close} />}
      {mode === 'delete' && <DeleteConfirm player={player} onDelete={onDelete} onClose={close} />}
    </li>
  )
}
