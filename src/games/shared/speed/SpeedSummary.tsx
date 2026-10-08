import { Button } from '../../../ui/Button'
import { Mascot } from '../../../ui/mascot/Mascot'
import type { CharacterId } from '../../../core/storage/db'
import type { PersonalBest } from './personalBest'
import type { RoundStats } from './roundStats'

export interface SpeedSummaryProps {
  character: CharacterId
  best: PersonalBest
  stats: RoundStats
  /** Sentence about the destination reached, e.g. "El tren ha arribat a l'estació!". */
  arrival: string
  onContinue: () => void
}

/** End of a speed round: celebrates the streak and the child's own improvement. No scores, no grades. */
export function SpeedSummary({ character, best, stats, arrival, onContinue }: SpeedSummaryProps) {
  const streakLine =
    stats.bestStreak >= 2 ? `Ratxa: ${stats.bestStreak} respostes ràpides seguides!` : 'Cada resposta et fa més ràpid.'
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-5 p-4 text-center" data-testid="speed-summary">
      <Mascot character={character} mood={best.faster ? 'balla' : 'content'} size={150} />
      <h2 className="text-4xl font-bold tracking-tight text-brand-dark sm:text-5xl">{arrival}</h2>
      <p role="status" className="sticker rounded-[2rem] bg-sol px-6 py-3 text-2xl font-bold text-punk">
        {best.record ? '🏅 Nou rècord personal! ' : ''}
        {best.headline}
      </p>
      <p className="text-xl font-bold text-ink">{streakLine}</p>
      <Button big onClick={onContinue}>
        Continua
      </Button>
    </div>
  )
}
