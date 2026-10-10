import { useEffect, useState } from 'react'
import { GAME_TITLES } from '../../../features/play/gameTypes'
import { loadPastAttempts } from '../../../games/shared/speed/loadPastAttempts'
import type { PastAttempt } from '../../../games/shared/speed/personalBest'
import { PALETTE as P } from '../../art/palette'
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
function Rosette({ tier, size }: { tier: RibbonTier; size: number }) {
  const c = TIER_COLOUR[tier]
  return (
    <svg viewBox="0 0 60 80" height={size} width={(size * 60) / 80} aria-hidden="true">
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

function RibbonItem({ ribbon, size }: { ribbon: Ribbon; size: number }) {
  const title = GAME_TITLES[ribbon.gameId] ?? ribbon.gameId
  return (
    <li className="flex min-w-0 flex-1 flex-col items-center text-center" aria-label={`${title}: ${ribbon.label}`} data-tier={ribbon.tier}>
      <TapProp
        prop={{ id: `cinta-${ribbon.gameId}`, label: `La cinta de ${title}`, kind: 'cinta' }}
        sound="squish"
        onTap={arcadeSfx.ticket}
        className="grid place-items-center"
      >
        <Rosette tier={ribbon.tier} size={size} />
      </TapProp>
      <span aria-hidden="true" className="hidden text-xs font-bold leading-tight text-[var(--world-ink,#2b2440)] sm:block">
        {title}
      </span>
    </li>
  )
}

export interface RibbonsBoardProps {
  /** Bumped after every round played, so the ribbons are read again. */
  plays: number
  /** Height in px of one rosette. */
  size: number
}

/** The board of personal-best ribbons that hangs over the prize counter: only her own play, never scores. */
export function RibbonsBoard({ plays, size }: RibbonsBoardProps) {
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
  return (
    <section aria-label="El taulell dels tiquets" className="rounded-[1.1rem] px-2 pb-1 pt-1" style={{ background: 'linear-gradient(#F4D3A6, #EBC08E)', boxShadow: 'inset 0 5px 0 #D9A06C' }}>
      <p aria-hidden="true" className="mb-0.5 hidden text-center text-[0.65rem] sm:block font-bold uppercase tracking-widest text-[var(--world-xocolata,#8a5638)]">
        Tiquets i cintes
      </p>
      <ul aria-label="Cintes personals" className="flex items-start justify-center gap-1">
        {ribbons.map((r) => (
          <RibbonItem key={r.gameId} ribbon={r} size={size} />
        ))}
      </ul>
    </section>
  )
}
