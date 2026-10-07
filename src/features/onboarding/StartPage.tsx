import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { unlockAudio } from '../../core/audio/sfx'
import { useProgress } from '../../core/progress/store'
import { CHARACTER_IDS } from '../../core/storage/db'
import { Button } from '../../ui/Button'
import { Mascot } from '../../ui/mascot/Mascot'
import { InstallHint } from './InstallHint'

const TILTS = [-6, 4, -2, 5, -5] as const

export default function StartPage() {
  const navigate = useNavigate()
  const profile = useProgress((s) => s.profile)

  const start = () => {
    unlockAudio()
    navigate(profile ? '/' : '/onboarding')
  }

  return (
    <div className="notebook flex min-h-full flex-col items-center justify-center gap-8 overflow-hidden px-4 py-10 text-center">
      <div className="relative z-10 flex flex-col items-center gap-2">
        <motion.h1
          initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
          animate={{ scale: 1, rotate: -2, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          className="sticker rounded-[2rem] bg-white px-8 py-4 text-5xl font-bold leading-tight tracking-tight text-brand-dark sm:text-7xl"
        >
          Mates Màgiques
        </motion.h1>
        <p className="text-xl font-semibold text-ink/70">L’illa dels números t’espera</p>
      </div>

      <div className="relative z-10 flex max-w-3xl flex-wrap items-end justify-center gap-x-2 gap-y-4">
        {CHARACTER_IDS.map((id, i) => (
          <motion.div
            key={id}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.09, type: 'spring', stiffness: 220, damping: 16 }}
            style={{ rotate: TILTS[i] ?? 0 }}
          >
            <Mascot character={id} mood={i === 2 ? 'salut' : 'anims'} size={i === 2 ? 150 : 112} />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5">
        <Button big tilt={-2} className="min-h-24 px-12 text-4xl" onClick={start}>
          Toca per començar
        </Button>
        <InstallHint />
      </div>
    </div>
  )
}
