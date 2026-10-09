import { motion } from 'motion/react'
import { PALETTE as P } from '../../../art/palette'
import { neighbourFor } from '../../../errands/requestText'
import { queueOf } from '../../../errands/neighbourMood'
import { Neighbour } from '../../../scene/art'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'

function DoorArt() {
  return (
    <svg viewBox="0 0 120 220" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <rect x="0" y="0" width="120" height="220" rx="14" fill={P.neu.base} />
      <rect x="10" y="10" width="100" height="210" rx="8" fill="#BFE6FF" />
      <path d="M10 150 Q60 128 110 146 L110 220 L10 220 Z" fill={P.llima.light} />
      <rect x="10" y="190" width="100" height="30" fill="#F3E3C3" />
      {/* The door itself, swung open against the wall. */}
      <path d="M110 10 L122 18 L122 214 L110 220 Z" fill={P.menta.shade} />
      <rect x="22" y="22" width="76" height="22" rx="8" fill={P.mango.base} />
      <text x="60" y="38" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="14" fill={P.carbo.base}>
        OBERT
      </text>
    </svg>
  )
}

/** The shop door: the neighbours still waiting stand in the doorway, so she sees how many are left. */
export function DoorQueue({ pending, serving, visit, className = '' }: { pending: number; serving: boolean; visit: number; className?: string }) {
  const reduced = useWorldReducedMotion()
  const queue = queueOf(pending, serving, visit)
  const label = queue.waiting === 0 ? 'Ningú més a la cua' : `${queue.waiting} ${queue.waiting === 1 ? 'veí espera' : 'veïns esperen'} a la porta`
  return (
    <div role="img" aria-label={label} data-testid="door-queue" data-waiting={queue.waiting} className={`aspect-[120/220] ${className}`}>
      <DoorArt />
      <div className="absolute inset-x-0 bottom-[3%] flex items-end justify-center">
        {queue.shown.map((v, i) => (
          <motion.div
            key={v}
            initial={reduced ? false : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 16, delay: i * 0.12 }}
            className="-mx-[14%] first:ml-0"
            style={{ zIndex: 10 - i }}
          >
            <div className="h-[clamp(4.5rem,13vh,7.5rem)] [&>svg]:h-full [&>svg]:w-auto" style={{ transform: `scale(${1 - i * 0.12})`, transformOrigin: '50% 100%' }}>
              <Neighbour id={neighbourFor(v).id} size={110} animated={i === 0} title="" look={{ x: -0.6, y: 0 }} />
            </div>
          </motion.div>
        ))}
      </div>
      {queue.more > 0 && (
        <span aria-hidden="true" className="absolute -right-2 top-[30%] grid size-10 place-items-center rounded-full bg-white text-lg font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-soft)]">
          +{queue.more}
        </span>
      )}
    </div>
  )
}
