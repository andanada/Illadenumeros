import { motion } from 'motion/react'
import { PALETTE as P } from '../../../art/palette'
import { queueOf } from '../../../errands/neighbourMood'
import { neighbourFor } from '../../../errands/requestText'
import { Neighbour } from '../../../scene/art'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'

function DoorArt() {
  return (
    <svg viewBox="0 0 120 220" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <rect x="0" y="0" width="120" height="220" rx="14" fill={P.neu.base} />
      <rect x="10" y="10" width="100" height="210" rx="8" fill="#F3E3C3" />
      <rect x="10" y="10" width="100" height="120" rx="8" fill="#FFE2CF" />
      <rect x="40" y="40" width="40" height="52" rx="6" fill={P.mango.light} />
      <path d="M110 10 L124 18 L124 214 L110 220 Z" fill={P.cel.shade} />
      <rect x="10" y="196" width="100" height="24" fill={P.coral.light} />
    </svg>
  )
}

/** The kitchen door: whoever else wants to cook today waits in the doorway (so she sees how many are left). */
export function KitchenDoor({ pending, serving, visit, className = '' }: { pending: number; serving: boolean; visit: number; className?: string }) {
  const reduced = useWorldReducedMotion()
  const queue = queueOf(pending, serving, visit)
  const label = queue.waiting === 0 ? 'Ningú més a la porta' : `${queue.waiting} ${queue.waiting === 1 ? 'veí espera' : 'veïns esperen'} a la porta`
  return (
    <div role="img" aria-label={label} data-testid="door-queue" data-waiting={queue.waiting} className={`aspect-[120/220] ${className}`}>
      <DoorArt />
      <div className="absolute inset-x-0 bottom-[3%] flex items-end justify-center">
        {queue.shown.map((v, i) => (
          <motion.div
            key={v}
            initial={reduced ? false : { x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 16, delay: i * 0.12 }}
            className="-mx-[14%] first:ml-0"
            style={{ zIndex: 10 - i }}
          >
            <div className="h-[clamp(4rem,12vh,7rem)] [&>svg]:h-full [&>svg]:w-auto" style={{ transform: `scale(${1 - i * 0.12})`, transformOrigin: '50% 100%' }}>
              <Neighbour id={neighbourFor(v).id} size={110} animated={i === 0} title="" look={{ x: 0.6, y: 0 }} />
            </div>
          </motion.div>
        ))}
      </div>
      {queue.more > 0 && (
        <span aria-hidden="true" className="absolute -left-2 top-[30%] grid size-10 place-items-center rounded-full bg-white text-lg font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-soft)]">
          +{queue.more}
        </span>
      )}
    </div>
  )
}
