import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { PALETTE as P } from '../../../art/palette'
import { FitProp } from '../../../scene/art'
import { TapProp } from '../../../scene/Scene'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { arcadeSfx } from '../arcadeSfx'
import { CLAW_MESSAGE, COLUMNS, dropClaw, grabToy, initialClaw, liftDone, moveClaw, refill, type ClawState } from './clawLogic'

const TRAVEL_MS = 650
const pad =
  'grid min-h-14 place-items-center rounded-2xl text-3xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-40'

/** The claw machine toy: slide the claw, drop it, take a prize. Free play, no coins; the toys react to taps. */
export function ClawMachine({ lit, compact, onPrize }: { lit: boolean; compact: boolean; onPrize?: () => void }) {
  const reduced = useWorldReducedMotion()
  const [claw, setClaw] = useState<ClawState>(initialClaw)
  const busy = claw.phase === 'dropping' || claw.phase === 'lifting'

  // The claw takes a moment to go down and up (instant with reduced motion); the state decides the outcome.
  useEffect(() => {
    if (claw.phase !== 'dropping' && claw.phase !== 'lifting') return
    const t = setTimeout(
      () => {
        if (claw.phase === 'dropping') {
          const next = grabToy(claw)
          if (next.result === 'won') {
            arcadeSfx.prize()
            onPrize?.()
          }
          else arcadeSfx.slip()
          setClaw(next)
        } else setClaw(refill(liftDone(claw)))
      },
      reduced ? 0 : TRAVEL_MS,
    )
    return () => clearTimeout(t)
    // `onPrize` only reports; it never decides what happens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claw, reduced])

  const move = (step: -1 | 1): void => {
    arcadeSfx.button()
    setClaw((c) => moveClaw(c, step))
  }
  const drop = (): void => {
    arcadeSfx.whirr()
    setClaw((c) => dropClaw(c))
  }

  const colW = 100 / COLUMNS
  return (
    <section
      aria-label="La màquina de la grua"
      className={`flex flex-col items-center gap-2 ${compact ? 'w-full max-w-[13rem]' : 'w-full max-w-[15rem]'}`}
    >
      <div
        className="relative w-full overflow-hidden rounded-t-[1.6rem] rounded-b-[0.8rem] border-[10px] border-b-[34px]"
        style={{ borderColor: P.rosa.base, background: lit ? '#FFF3B0' : '#CBB7E6', aspectRatio: compact ? '5/5.2' : '5/6' }}
        role="img"
        aria-label={`Grua: ${claw.won.length} premis. ${CLAW_MESSAGE[claw.result]}`}
      >
        <div className="absolute inset-x-0 top-0 h-3" style={{ background: P.rosa.shade }} />
        <motion.div
          className="absolute top-0 z-10 flex flex-col items-center"
          style={{ width: `${colW}%` }}
          initial={false}
          animate={{ left: `${claw.column * colW}%` }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 18 }}
        >
          <motion.span
            className="block w-1 rounded-full"
            style={{ background: P.carbo.light }}
            initial={false}
            animate={{ height: claw.phase === 'dropping' ? '170%' : '14%' }}
            transition={reduced ? { duration: 0 } : { duration: TRAVEL_MS / 1000, ease: 'easeInOut' }}
          />
          <span aria-hidden="true" className="-mt-1 text-2xl leading-none">
            🪝
          </span>
        </motion.div>
        <div className="absolute inset-x-0 bottom-0 flex h-[34%] items-end px-1 pb-1">
          {claw.toys.map((toy, i) => (
            <div key={i} className="flex flex-1 items-end justify-center">
              {toy && <FitProp id={toy} box={compact ? 28 : 36} />}
            </div>
          ))}
        </div>
        {/* The prize chute. */}
        <div
          className="absolute inset-x-2 bottom-[-28px] z-20 flex h-6 items-center justify-center gap-1 rounded-lg"
          style={{ background: P.carbo.base }}
        >
          {claw.won.slice(-3).map((toy, i) => (
            <TapProp
              key={`${toy}-${i}`}
              prop={{ id: `premi-${i}`, label: 'El premi de la grua', kind: 'joguina' }}
              sound="squish"
              className="-mt-5 grid size-9 place-items-end"
            >
              <FitProp id={toy} box={34} />
            </TapProp>
          ))}
        </div>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="min-h-6 rounded-full bg-white/90 px-3 py-0.5 text-center text-sm font-bold text-[var(--world-ink,#2b2440)] sm:text-base"
      >
        {CLAW_MESSAGE[claw.result]}
      </p>
      <div className="grid w-full grid-cols-2 gap-2">
        <button
          type="button"
          aria-label="Mou la grua a l’esquerra"
          disabled={busy}
          onClick={() => move(-1)}
          className={`${pad} bg-white text-[var(--world-ink,#2b2440)]`}
        >
          ◀
        </button>
        <button
          type="button"
          aria-label="Mou la grua a la dreta"
          disabled={busy}
          onClick={() => move(1)}
          className={`${pad} bg-white text-[var(--world-ink,#2b2440)]`}
        >
          ▶
        </button>
        <button
          type="button"
          aria-label="Baixa la grua"
          disabled={busy}
          onClick={drop}
          className={`${pad} col-span-2 bg-[var(--world-coral,#ff6b5b)] text-xl text-white`}
        >
          Baixa la grua
        </button>
      </div>
    </section>
  )
}
