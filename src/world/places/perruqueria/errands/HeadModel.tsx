import { PALETTE as P } from '../../../art/palette'
import { slotsOf, type ClipTask, type Slot } from './clipLogic'

const SLOT_Y = (i: number): number => 18 + i * 9

function SlotDot({ slot, filled }: { slot: Slot; filled: boolean }) {
  const x = slot.side === 'left' ? 14 : 86
  const worn = slot.state === 'worn'
  return (
    <circle
      cx={x}
      cy={SLOT_Y(slot.index)}
      r={4.6}
      fill={worn ? P.mango.base : filled ? P.rosa.base : 'none'}
      stroke={worn || filled ? 'none' : P.carbo.light}
      strokeWidth={1.8}
      strokeDasharray={worn || filled ? undefined : '2 2'}
    />
  )
}

/** The picture of the request: a head with the places for the clips, a dashed ring for each wanted clip. */
export function HeadModel({ task, placed }: { task: ClipTask; placed: number }) {
  const slots = slotsOf(task)
  const wanted = slots.filter((s) => s.state === 'wanted')
  const wantedFilled = new Set(wanted.slice(0, Math.max(0, placed)))
  return (
    <svg viewBox="0 0 100 120" className="h-28 w-auto shrink-0" role="img" aria-label={task.mode === 'pair' ? `Cap amb ${task.a} pinces a l’esquerra i ${task.b} a la dreta` : `Cap amb ${task.a} pinces posades`}>
      <ellipse cx="50" cy="60" rx="36" ry="44" fill="#F7C9A2" />
      <path d="M14 56 Q14 10 50 10 Q86 10 86 56 Q70 30 50 30 Q30 30 14 56 Z" fill={P.xocolata.base} />
      <circle cx="38" cy="66" r="3" fill={P.carbo.base} />
      <circle cx="62" cy="66" r="3" fill={P.carbo.base} />
      <path d="M40 84 Q50 92 60 84" stroke={P.carbo.base} strokeWidth="3" fill="none" strokeLinecap="round" />
      {slots.map((s, k) => (
        <SlotDot key={k} slot={s} filled={wantedFilled.has(s)} />
      ))}
    </svg>
  )
}
