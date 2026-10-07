import { AnimatePresence, motion } from 'motion/react'
import { useProgress } from '../../core/progress/store'
import { Mascot } from '../../ui/mascot/Mascot'
import type { Mood } from '../../ui/mascot/characters'

export interface FeedbackBarProps {
  mood: Mood
  message: string
  tone?: 'neutral' | 'ok' | 'almost'
  /** Optional big action (e.g. "Següent"). */
  action?: React.ReactNode
}

const TONES = {
  neutral: 'bg-white text-ink',
  ok: 'bg-ok text-white',
  almost: 'bg-almost text-white',
} as const

/** Mascot + speech-bubble sticker at the bottom of every game; polite live region. */
export function FeedbackBar({ mood, message, tone = 'neutral', action }: FeedbackBarProps) {
  const character = useProgress((s) => s.profile?.character) ?? 'nyx'
  return (
    <div className="flex items-end gap-3 p-3 pb-4">
      <Mascot character={character} mood={mood} size={72} />
      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          role="status"
          aria-live="polite"
          initial={{ scale: 0.85, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={`sticker min-h-16 flex-1 rounded-[1.6rem] px-5 py-3 text-xl font-semibold leading-snug sm:text-2xl ${TONES[tone]}`}
        >
          {message}
        </motion.p>
      </AnimatePresence>
      {action}
    </div>
  )
}
