import { motion } from 'motion/react'
import { useEffect } from 'react'
import { sfx } from '../../core/audio/sfx'
import type { CharacterId } from '../../core/storage/db'
import { Button } from '../../ui/Button'
import { Confetti } from '../../ui/Confetti'
import { Mascot } from '../../ui/mascot/Mascot'
import type { Mood } from '../../ui/mascot/characters'
import type { GameSummary } from './gameTypes'
import { starsForSummary } from './summaryStars'

const MESSAGES: Record<1 | 2 | 3, string> = {
  3: 'Quina meravella!',
  2: 'Molt bé!',
  1: 'Has après molt!',
}

export interface GameSummaryViewProps {
  summary: GameSummary
  character: CharacterId
  onReplay: () => void
  onMap: () => void
}

export function GameSummaryView({ summary, character, onReplay, onMap }: GameSummaryViewProps) {
  const stars = starsForSummary(summary)
  const mood: Mood = stars === 3 ? 'balla' : 'content'
  useEffect(() => {
    sfx.fanfare()
  }, [])
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
      {stars === 3 && <Confetti />}
      <Mascot character={character} mood={mood} size={170} />
      <h2 className="text-5xl font-bold tracking-tight text-brand-dark">{MESSAGES[stars]}</h2>
      <div role="img" aria-label={`${stars} de 3 estrelles`} className="flex gap-3">
        {[1, 2, 3].map((n) => (
          <motion.span
            key={n}
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: n % 2 === 0 ? 6 : -6 }}
            transition={{ delay: 0.15 * n, type: 'spring', stiffness: 300, damping: 14 }}
            className={`text-6xl ${n <= stars ? '' : 'opacity-25 grayscale'}`}
          >
            ⭐
          </motion.span>
        ))}
      </div>
      <p className="sticker rounded-full bg-white px-6 py-3 text-2xl font-bold text-brand-dark">
        🌸 {summary.petals} {summary.petals === 1 ? 'pètal' : 'pètals'} · {summary.correct} {summary.correct === 1 ? 'repte superat' : 'reptes superats'}
      </p>
      {summary.masteredSkillIds.length > 0 && <p className="text-xl font-bold text-chicle">Has dominat una habilitat nova!</p>}
      <div className="flex flex-wrap justify-center gap-4">
        <Button big tilt={-2} onClick={onReplay}>
          Tornar a jugar
        </Button>
        <Button big variant="soft" tilt={2} onClick={onMap}>
          Tornar al poble
        </Button>
      </div>
    </div>
  )
}
