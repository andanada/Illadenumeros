import { motion } from 'motion/react'
import type { Choice } from '../../core/ambit/types'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { usePrefersReducedMotion } from '../shared/speed/usePrefersReducedMotion'
import { openValue, trayPips, type Chain, type Half } from './dominoLogic'
import type { TrayProps } from '../shared/arith/ArithFrame'

const HALF = 'grid min-h-20 min-w-20 place-items-center px-2 text-3xl font-bold text-ink'

function Pips({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="flex max-w-[3.5rem] flex-wrap items-center justify-center gap-1">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="size-3 rounded-full bg-brand-dark" />
      ))}
    </span>
  )
}

function HalfView({ half }: { half: Half }) {
  return <span className={HALF}>{half.kind === 'pips' ? <Pips n={half.n} /> : half.kind === 'num' ? half.n : half.text}</span>
}

const Divider = () => <span aria-hidden="true" className="my-2 w-1 self-stretch rounded-full bg-brand-dark/40" />

/** The chain already on the table plus the open end that waits for the child's domino. */
export function DominoChain({ chain, shown }: { chain: Chain; shown: number | null }) {
  const reduced = usePrefersReducedMotion()
  const { open } = chain
  const label = open.mode === 'addend' ? `${open.known} + ${shown ?? '?'}` : shown === null ? '?' : String(shown)
  const ok = shown !== null && openValue(open, shown) === open.target
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" data-testid="domino-chain">
      {chain.fixed.map((d) => (
        <span key={d.id} className="sticker flex items-center rounded-2xl bg-white">
          <HalfView half={d.left} />
          <Divider />
          <HalfView half={d.right} />
        </span>
      ))}
      <motion.span
        data-testid="domino-open"
        animate={ok && !reduced ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        className={`sticker flex items-center rounded-2xl border-4 border-dashed ${ok ? 'border-ok bg-ok/20' : 'border-brand bg-brand-soft'}`}
      >
        <span className={HALF}>{label}</span>
        <Divider />
        <span className={HALF}>
          <Pips n={((shown ?? 0) % 6) + 1} />
        </span>
      </motion.span>
    </div>
  )
}

const COLORS = ['bg-chicle', 'bg-cel', 'bg-menta', 'bg-sol'] as const

/** Tray of loose dominoes: each one is a button named `Resposta N` (N = the half that would touch). */
export function DominoTray({ choices, wrongValues, disabled, onPick }: TrayProps) {
  return (
    <div role="group" aria-label="Respostes" className="flex flex-wrap items-center justify-center gap-3 p-2">
      {choices.map((choice: Choice, i) => (
        <motion.button
          key={choice.value}
          type="button"
          aria-label={`Resposta ${choice.value}`}
          disabled={disabled || wrongValues.includes(choice.value)}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            unlockAudio()
            sfx.tap()
            onPick(choice)
          }}
          style={{ rotate: (i % 2 === 0 ? -2 : 2) }}
          className={`sticker flex min-h-20 items-center rounded-2xl text-ink disabled:opacity-35 ${COLORS[i % COLORS.length]}`}
        >
          <span className={HALF}>{choice.value}</span>
          <Divider />
          <span className={HALF}>
            <Pips n={trayPips(Number(choice.value))} />
          </span>
        </motion.button>
      ))}
    </div>
  )
}
