import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { unlockAudio } from '../../core/audio/sfx'
import { useProgress, type PlayerSummary } from '../../core/progress/store'
import { CHARACTERS } from '../../ui/mascot/characters'
import { Mascot } from '../../ui/mascot/Mascot'
import { AdultGate } from '../family/AdultGate'
import { lastPlayedLabel, playerLabel } from './playerLabels'

const TILTS = [-2, 1.5, -1, 2, -1.5] as const

function PlayerCard({ player, showCharacter, index, now, onPick }: { player: PlayerSummary; showCharacter: boolean; index: number; now: number; onPick: () => void }) {
  return (
    <motion.button
      type="button"
      data-theme={player.color}
      aria-label={`Entra: ${playerLabel(player, showCharacter)}`}
      whileTap={{ scale: 0.96 }}
      onClick={onPick}
      style={{ rotate: TILTS[index % TILTS.length] ?? 0 }}
      className="sticker flex min-h-56 w-full flex-col items-center justify-center gap-1 rounded-[2rem] bg-brand-soft px-4 pb-4 pt-3 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand"
    >
      <Mascot character={player.character} mood="salut" size={120} />
      <span className="max-w-full truncate text-4xl font-bold tracking-tight text-brand-dark">{player.name}</span>
      {showCharacter && <span className="text-lg font-semibold text-brand-dark/80">amb {CHARACTERS[player.character].name}</span>}
      <span className="text-base font-semibold text-ink/60">{lastPlayedLabel(player.lastPlayedAt, now)}</span>
    </motion.button>
  )
}

export interface PlayerPickerPageProps {
  /** Seed of the adult check; injected in tests. */
  seed?: string
}

/** "Qui juga?": one big sticker per child of this device, plus an adult-only "new player" card. */
export default function PlayerPickerPage({ seed }: PlayerPickerPageProps) {
  const navigate = useNavigate()
  const players = useProgress((s) => s.players)
  const selectPlayer = useProgress((s) => s.selectPlayer)
  const [gateSeed, setGateSeed] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [now] = useState(() => Date.now())

  const duplicated = useMemo(() => {
    const counts = players.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.name.toLocaleLowerCase('ca')]: (acc[p.name.toLocaleLowerCase('ca')] ?? 0) + 1 }), {})
    return (p: PlayerSummary) => (counts[p.name.toLocaleLowerCase('ca')] ?? 0) > 1
  }, [players])

  if (players.length === 0) return <Navigate to="/start" replace />

  const pick = async (id: string) => {
    if (busy) return
    unlockAudio()
    setBusy(true)
    await selectPlayer(id)
    navigate('/', { replace: true })
  }

  return (
    <main className="notebook flex min-h-full flex-col items-center gap-8 px-4 py-10">
      <h1 className="sticker -rotate-2 rounded-[2rem] bg-white px-8 py-3 text-5xl font-bold tracking-tight text-brand-dark sm:text-6xl">Qui juga?</h1>
      <ul aria-label="Jugadors" className="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((player, i) => (
          <li key={player.id}>
            <PlayerCard player={player} index={i} now={now} showCharacter={duplicated(player)} onPick={() => void pick(player.id)} />
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-label="Nou jugador o jugadora (només adults)"
            onClick={() => setGateSeed(seed ?? crypto.randomUUID())}
            className="sticker flex min-h-56 w-full flex-col items-center justify-center gap-2 rounded-[2rem] border-4 border-dashed border-brand/40 bg-white/70 px-4 text-3xl font-bold text-brand-dark focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand"
          >
            <span aria-hidden="true" className="text-5xl">
              +
            </span>
            Nou jugador/a
            <span aria-hidden="true" className="text-base font-semibold text-ink/60">
              🔒 només adults
            </span>
          </button>
        </li>
      </ul>
      {gateSeed && <AdultGate seed={gateSeed} onPass={() => navigate('/onboarding')} onCancel={() => setGateSeed(undefined)} />}
    </main>
  )
}
