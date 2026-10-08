import { useDroppable } from '@dnd-kit/core'
import { motion, useReducedMotion } from 'motion/react'
import { expressionTokens, type BalanceState, type Equation, type Token } from './scaleLogic'

export const SLOT_DROP_ID = 'slot'

const SPRING = { type: 'spring', stiffness: 90, damping: 9 } as const
const NO_MOTION = { duration: 0 } as const

function Strings() {
  return (
    <svg viewBox="0 0 100 44" aria-hidden="true" className="h-11 w-full">
      <path d="M50 0 L8 44 M50 0 L92 44" stroke="#2a1b3d" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="3" r="5" fill="#ffd23f" stroke="#fff" strokeWidth="2" />
    </svg>
  )
}

function TokenView({ token, hasGuess, highlight }: { token: Token; hasGuess: boolean; highlight: boolean }) {
  if (token.kind === 'op') return <span className="text-3xl font-bold text-brand-dark">{token.text}</span>
  if (token.kind === 'number') {
    return <span className="sticker grid h-14 min-w-11 place-items-center rounded-2xl bg-cel px-1.5 text-3xl font-bold text-ink">{token.text}</span>
  }
  return (
    <span
      data-testid="hidden-slot"
      className={`grid size-16 shrink-0 place-items-center rounded-2xl border-4 border-dashed text-4xl font-bold transition-colors ${
        hasGuess ? 'sticker border-white bg-chicle text-white' : highlight ? 'border-sol bg-sol/30 text-ink' : 'border-brand/50 bg-white/70 text-brand-dark'
      }`}
    >
      {token.text}
    </span>
  )
}

function LeftPan({ equation, guess, dragging }: { equation: Equation; guess: number | null; dragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: SLOT_DROP_ID })
  return (
    <div ref={setNodeRef} className="flex flex-nowrap items-center justify-center gap-1 px-1 pb-1">
      {expressionTokens(equation, guess).map((token, i) => (
        <TokenView key={i} token={token} hasGuess={guess !== null} highlight={isOver || dragging} />
      ))}
    </div>
  )
}

function Pan({ angle, reduce, side, children }: { angle: number; reduce: boolean; side: 'left' | 'right'; children: React.ReactNode }) {
  // The pan hangs from the beam: it follows the beam end but is always kept level.
  return (
    <div className={`absolute top-1/2 w-[44%] ${side === 'left' ? 'left-[3%]' : 'right-[3%]'}`}>
      <motion.div initial={false} animate={{ rotate: -angle }} transition={reduce ? NO_MOTION : SPRING} style={{ transformOrigin: '50% 0%' }}>
        <Strings />
        <div className="sticker -mt-1 flex min-h-24 items-center justify-center rounded-b-[2.2rem] rounded-t-lg bg-sol/50 py-2">{children}</div>
      </motion.div>
    </div>
  )
}

export interface BalanceScaleProps {
  equation: Equation
  state: BalanceState
  guess: number | null
  dragging: boolean
}

/** A two-pan balance: the left pan holds the equation with the hidden number, the right pan its result. */
export function BalanceScale({ equation, state, guess, dragging }: BalanceScaleProps) {
  const reduce = useReducedMotion() ?? false
  const label =
    state.verdict === 'balanced'
      ? 'La balança està en equilibri'
      : state.verdict === 'left-heavy'
        ? 'La balança pesa més a l’esquerra'
        : 'La balança pesa més a la dreta'
  return (
    <div role="img" aria-label={`${label}. A l’esquerra hi ha ${equation.a === 'hidden' ? 'el número amagat' : equation.a} ${equation.op} ${equation.b === 'hidden' ? 'el número amagat' : equation.b}, a la dreta hi ha ${equation.result}.`} className="relative mx-auto h-60 w-full max-w-[26rem]">
      <div aria-hidden="true" className="absolute bottom-2 left-1/2 top-8 w-4 -translate-x-1/2 rounded-full bg-brand" />
      <div aria-hidden="true" className="sticker absolute bottom-0 left-1/2 h-5 w-40 -translate-x-1/2 rounded-full bg-brand" />
      <motion.div
        initial={false}
        animate={{ rotate: state.angle }}
        transition={reduce ? NO_MOTION : SPRING}
        className="absolute inset-x-0 top-6 h-3.5 rounded-full bg-brand-dark shadow-md"
        style={{ transformOrigin: '50% 50%' }}
      >
        <Pan side="left" angle={state.angle} reduce={reduce}>
          <LeftPan equation={equation} guess={guess} dragging={dragging} />
        </Pan>
        <Pan side="right" angle={state.angle} reduce={reduce}>
          <span className="sticker grid h-14 min-w-14 place-items-center rounded-2xl bg-menta px-3 text-4xl font-bold text-ink">{equation.result}</span>
        </Pan>
      </motion.div>
      <div aria-hidden="true" className="sticker absolute left-1/2 top-[1.1rem] size-8 -translate-x-1/2 rounded-full bg-sol" />
    </div>
  )
}
