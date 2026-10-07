import { GAME_TITLES } from '../../features/play/gameTypes'
import { Screen, SpeakerButton } from '../../ui/Screen'

export interface GameShellProps {
  gameId: string
  roundNumber: number
  maxRounds: number | undefined
  petals: number
  onExit: () => void
  /** Text read aloud by the speaker button, if any. */
  speech?: string
  children: React.ReactNode
}

const MAX_DOTS = 12

function RoundStrip({ round, max }: { round: number; max: number | undefined }) {
  if (max === undefined || max > MAX_DOTS) {
    return <span className="sticker whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-lg font-bold text-brand-dark sm:px-4 sm:py-2 sm:text-xl">Ronda {round}</span>
  }
  return (
    <ol aria-label={`Ronda ${round} de ${max}`} className="hidden gap-1.5 sm:flex">
      {Array.from({ length: max }, (_, i) => (
        <li key={i} aria-hidden="true" className={`size-5 rounded-full border-4 border-white ${i < round - 1 ? 'bg-sol' : i === round - 1 ? 'bg-brand' : 'bg-brand-soft'}`} />
      ))}
    </ol>
  )
}

/** Notebook screen with back button, round strip, petals counter and optional speaker. */
export function GameShell({ gameId, roundNumber, maxRounds, petals, onExit, speech, children }: GameShellProps) {
  return (
    <Screen
      title={GAME_TITLES[gameId] ?? gameId}
      back={onExit}
      right={
        <>
          <RoundStrip round={roundNumber} max={maxRounds} />
          <span aria-label={`${petals} pètals`} className="sticker whitespace-nowrap rounded-full bg-chicle px-3 py-1.5 text-xl font-bold text-white sm:px-4 sm:py-2 sm:text-2xl">
            🌸 {petals}
          </span>
          {speech !== undefined && <SpeakerButton text={speech} label="Escoltar la pregunta" />}
        </>
      }
    >
      {children}
    </Screen>
  )
}
