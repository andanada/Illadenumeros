import { useEffect, useState } from 'react'
import { GAME_TITLES } from '../../../features/play/gameTypes'
import { loadPastAttempts } from '../../../games/shared/speed/loadPastAttempts'
import type { PastAttempt } from '../../../games/shared/speed/personalBest'
import { PALETTE as P } from '../../art/palette'
import { Neighbour } from '../../scene/art'
import { TapProp } from '../../scene/Scene'
import { arcadeSfx } from './arcadeSfx'
import { ribbonsOf, type Ribbon, type RibbonTier } from './ribbons'

const TIER_COLOUR: Readonly<Record<RibbonTier, { fill: string; tail: string }>> = {
  0: { fill: '#E4D9C6', tail: '#CFC3AE' },
  1: { fill: P.xocolata.light, tail: P.xocolata.base },
  2: { fill: '#C9D3DE', tail: '#9FB0C2' },
  3: { fill: P.mango.base, tail: P.mango.shade },
}

/** A rosette with two tails; the number of stars inside is its tier. No numbers, no scores. */
function Rosette({ tier }: { tier: RibbonTier }) {
  const c = TIER_COLOUR[tier]
  return (
    <svg viewBox="0 0 60 80" className="h-16 w-auto" aria-hidden="true">
      <path d="M16 40 L8 76 L24 66 L30 78 L34 44 Z" fill={c.tail} />
      <path d="M44 40 L52 76 L36 66 L30 78 L26 44 Z" fill={c.tail} />
      <circle cx={30} cy={28} r={22} fill={c.fill} />
      <circle cx={30} cy={28} r={15} fill="#fff" opacity={0.4} />
      {Array.from({ length: tier }, (_, i) => (
        <path
          key={i}
          d={`M${30 + (i - (tier - 1) / 2) * 11} 22 l2.4 5.2 5.6 .6 -4.2 3.8 1.2 5.5 -5 -2.9 -5 2.9 1.2 -5.5 -4.2 -3.8 5.6 -.6z`}
          fill={tier === 3 ? '#fff' : P.carbo.base}
          opacity={tier === 3 ? 0.95 : 0.7}
        />
      ))}
    </svg>
  )
}

function RibbonItem({ ribbon }: { ribbon: Ribbon }) {
  const title = GAME_TITLES[ribbon.gameId] ?? ribbon.gameId
  return (
    <li className="flex min-w-0 flex-1 flex-col items-center text-center" aria-label={`${title}: ${ribbon.label}`} data-tier={ribbon.tier}>
      <TapProp
        prop={{ id: `cinta-${ribbon.gameId}`, label: `La cinta de ${title}`, kind: 'cinta' }}
        sound="squish"
        onTap={arcadeSfx.ticket}
        className="grid place-items-center"
      >
        <Rosette tier={ribbon.tier} />
      </TapProp>
      <span aria-hidden="true" className="text-xs font-bold leading-tight text-[var(--world-ink,#2b2440)]">
        {title}
      </span>
    </li>
  )
}

export interface TicketCounterProps {
  /** Bumped after every round played, so the ribbons are read again. */
  plays: number
  pending: number
  compact: boolean
}

/** The ticket counter: a neighbour behind it and the child's personal-best ribbons hanging in front. */
export function TicketCounter({ plays, pending, compact }: TicketCounterProps) {
  const [past, setPast] = useState<readonly PastAttempt[]>([])
  useEffect(() => {
    let alive = true
    void loadPastAttempts(Date.now()).then((rows) => {
      if (alive) setPast(rows)
    })
    return () => {
      alive = false
    }
  }, [plays])
  const ribbons = ribbonsOf(past)
  const size = compact ? 124 : 140
  const hello = pending > 0 ? 'Fes l’escalfament al Duel Llampec!' : 'Aquí tens les teves cintes. Cada dia, una mica més ràpid!'

  return (
    <section aria-label="El taulell dels tiquets" className="flex w-full max-w-[26rem] flex-col items-center">
      <p
        role="status"
        aria-live="polite"
        data-testid="arcade-bubble"
        className="relative mb-2 w-full rounded-[1.4rem] bg-white px-3 py-2 text-center text-base font-bold leading-snug text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)] sm:text-lg"
      >
        <span aria-hidden="true" className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 rounded-[3px] bg-white" />
        <span className="relative">{hello}</span>
      </p>
      <div className="relative z-10 shrink-0" style={{ marginBottom: -Math.round(size * 0.34) }}>
        <Neighbour id="en-kofi" pose={pending > 0 ? 'wave' : 'idle'} size={size} title="En Kofi" />
      </div>
      <div
        className="relative z-20 w-full rounded-t-[1.4rem] px-2 pb-2 pt-3"
        style={{ background: 'linear-gradient(#F4D3A6, #EBC08E)', boxShadow: 'inset 0 8px 0 #D9A06C' }}
      >
        <p className="mb-1 text-center text-sm font-bold uppercase tracking-widest text-[var(--world-xocolata,#8a5638)]">
          Tiquets i cintes
        </p>
        <ul aria-label="Cintes personals" className="flex items-start justify-center gap-1">
          {ribbons.map((r) => (
            <RibbonItem key={r.gameId} ribbon={r} />
          ))}
        </ul>
      </div>
      <div
        aria-hidden="true"
        className="h-4 w-full"
        style={{ background: P.coral.base, boxShadow: 'inset 0 -5px 0 rgba(43,36,64,0.18)' }}
      />
    </section>
  )
}
