import { animate, AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { FitProp } from '../scene/art'
import { useWorldReducedMotion } from '../scene/useReducedMotion'
import { worldSfx } from '../scene/worldSfx'

function CoinIcon() {
  return <FitProp id="moneda-poble" box={36} />
}

/** Coins counter: rolls up to the new total with a pop and a "+N" when coins arrive. */
export function CoinCounter({ coins }: { coins: number }) {
  const reduced = useWorldReducedMotion()
  const [shown, setShown] = useState(coins)
  const [gain, setGain] = useState<{ id: number; amount: number } | undefined>(undefined)
  const previous = useRef(coins)

  useEffect(() => {
    const from = previous.current
    previous.current = coins
    if (coins === from) return
    if (coins < from || reduced) {
      setShown(coins)
      if (coins > from) setGain({ id: Date.now(), amount: coins - from })
      return
    }
    worldSfx.coin()
    setGain({ id: Date.now(), amount: coins - from })
    const controls = animate(from, coins, { duration: 0.6, ease: 'easeOut', onUpdate: (v) => setShown(Math.round(v)) })
    return () => controls.stop()
  }, [coins, reduced])

  useEffect(() => {
    if (!gain) return
    const timer = setTimeout(() => setGain(undefined), 1400)
    return () => clearTimeout(timer)
  }, [gain])

  return (
    <div className="relative">
      <motion.p
        key={gain?.id ?? 0}
        initial={reduced || !gain ? false : { scale: 1.25 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 14 }}
        aria-label={`${coins} monedes`}
        data-testid="coins"
        data-coins={coins}
        className="flex min-h-16 items-center gap-2 rounded-full bg-white px-4 text-2xl font-bold tabular-nums text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)]"
      >
        <CoinIcon />
        <span aria-hidden="true">{shown}</span>
      </motion.p>
      <AnimatePresence>
        {gain && (
          <motion.span
            key={gain.id}
            aria-hidden="true"
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: reduced ? 0 : 26 }}
            exit={{ opacity: 0 }}
            className="absolute right-2 top-full rounded-full bg-[var(--world-mango,#ffb834)] px-3 py-0.5 text-xl font-bold text-white"
          >
            +{gain.amount}
          </motion.span>
        )}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {gain ? `Has guanyat ${gain.amount} ${gain.amount === 1 ? 'moneda' : 'monedes'}. En tens ${coins}.` : ''}
      </span>
    </div>
  )
}
