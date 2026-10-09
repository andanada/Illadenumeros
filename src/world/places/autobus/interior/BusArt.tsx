import { animate, motion, useMotionValue } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { PALETTE as P } from '../../../art/palette'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { FRAME } from '../errands/seatsLogic'
import { CELL, DOOR, FRAME_X, H, W, pct } from './busConstants'
import { seatBox } from './busGeometry'
import { useBusLook } from './busLook'
import { PassengerHead } from './Passenger'

/**
 * The town's double-decker, seen from the side, driving to the right. Its 20 windows are two ten-frames
 * (5 upstairs + 5 downstairs on each side of the middle door), so a full half is always "a ten".
 * Drawn in a 1000 × 400 box; the windows are DOM cells laid over the drawing so passengers can be tapped.
 */
function Wheel({ cx, spin }: { cx: number; spin: boolean }) {
  return (
    <g transform={`translate(${cx} 336)`}>
      <circle r={46} fill={P.carbo.base} />
      <motion.g
        animate={spin ? { rotate: 360 } : { rotate: 0 }}
        transition={spin ? { duration: 0.7, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
      >
        <circle r={22} fill={P.neu.shade} />
        <rect x={-4} y={-20} width={8} height={40} rx={4} fill={P.carbo.light} />
        <rect x={-20} y={-4} width={40} height={8} rx={4} fill={P.carbo.light} />
      </motion.g>
    </g>
  )
}

function Lamp({ x, y, on, blink }: { x: number; y: number; on: boolean; blink: boolean }) {
  return (
    <motion.rect
      x={x}
      y={y}
      width={16}
      height={26}
      rx={7}
      fill={on ? P.mango.light : P.mango.shade}
      animate={on && blink ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
      transition={on && blink ? { duration: 0.7, repeat: Infinity, times: [0, 0.5, 1] } : { duration: 0 }}
    />
  )
}

function Body({ destination }: { destination: string }) {
  const look = useBusLook()
  const reduced = useWorldReducedMotion()
  const blink = !reduced
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <ellipse cx={500} cy={384} rx={470} ry={14} fill="#2B2440" opacity={0.18} />
      <path d="M40 30 H900 Q984 30 990 120 L996 300 Q996 332 966 332 H40 Q18 332 18 308 V54 Q18 30 40 30 Z" fill={P.mango.base} />
      <path d="M18 250 H996 V300 Q996 332 966 332 H40 Q18 332 18 308 Z" fill={P.mango.shade} />
      <rect x={18} y={156} width={978} height={12} fill={P.coral.base} />
      <rect x={18} y={272} width={978} height={14} fill={P.coral.base} />
      {/* Two ten-frames, each on its own soft panel. */}
      {FRAME_X.map((x) => (
        <rect key={x} x={x - 10} y={52} width={CELL.step * 5 + 6} height={218} rx={22} fill={P.mango.shade} opacity={0.55} />
      ))}
      {/* Middle door (downstairs) and the destination sign above it. */}
      <rect x={DOOR.x} y={60} width={DOOR.w} height={60} rx={12} fill={P.carbo.base} />
      <text
        x={DOOR.x + DOOR.w / 2}
        y={102}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight={700}
        fontSize={30}
        fill={P.mango.light}
      >
        {destination}
      </text>
      <rect x={DOOR.x} y={172} width={DOOR.w} height={152} rx={10} fill={P.cel.light} />
      <rect x={DOOR.x + DOOR.w / 2 - 2} y={172} width={4} height={152} fill={P.mango.shade} />
      {/* Front: the windscreen with En Jordi at the wheel. */}
      <path d="M902 62 H948 Q980 66 984 120 L988 250 H902 Z" fill={look.night ? '#6E6AA8' : P.cel.light} />
      <rect x={902} y={176} width={36} height={14} rx={6} fill={P.carbo.light} />
      <Lamp x={978} y={290} on={look.indicator === 'right'} blink={blink} />
      <Lamp x={10} y={290} on={look.indicator === 'left'} blink={blink} />
      <circle cx={984} cy={312} r={12} fill={look.night ? '#FFF3B0' : P.neu.base} />
      <rect x={20} y={300} width={14} height={22} rx={6} fill={P.coral.shade} />
      <Wheel cx={200} spin={look.driving && !reduced} />
      <Wheel cx={790} spin={look.driving && !reduced} />
    </svg>
  )
}

function Wipers() {
  const look = useBusLook()
  const reduced = useWorldReducedMotion()
  const swing = look.wipers && !reduced
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <motion.g
        style={{ originX: '930px', originY: '246px' }}
        animate={swing ? { rotate: [-50, 10, -50] } : { rotate: look.wipers ? -10 : -50 }}
        transition={swing ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }}
      >
        <rect x={926} y={130} width={7} height={118} rx={3.5} fill={P.carbo.base} />
      </motion.g>
      {look.night && <path d="M992 300 L1240 250 L1240 380 Z" fill="#FFF3B0" opacity={0.35} />}
    </svg>
  )
}

export interface BusProps {
  /** What each of the 20 windows shows (a passenger, a draggable passenger, or nothing). */
  seat: (index: number) => ReactNode
  /** Accessible summary ("L’autobús: 8 passatgers"). */
  label: string
  /** Shown on the sign above the door (the stop number, the line…). */
  destination?: string
  className?: string
  children?: ReactNode
}

/** The bus with its windows; bounces with every honk and bobs while driving. */
export function Bus({ seat, label, destination = '10', className = '', children }: BusProps) {
  const look = useBusLook()
  const reduced = useWorldReducedMotion()
  const bounce = useMotionValue(0)

  useEffect(() => {
    if (look.honks === 0 || reduced) return
    const c = animate(bounce, [0, -10, 0, -5, 0], { duration: 0.45 })
    return () => c.stop()
  }, [look.honks, reduced, bounce])

  return (
    <motion.div
      role="group"
      aria-label={label}
      className={`relative aspect-[1000/400] w-full ${className}`}
      style={{ y: bounce }}
      animate={look.driving && !reduced ? { rotate: [0, -0.4, 0, 0.3, 0] } : { rotate: 0 }}
      transition={look.driving && !reduced ? { duration: 0.8, repeat: Infinity } : { duration: 0 }}
    >
      <Body destination={destination} />
      <div
        aria-hidden="true"
        className="absolute overflow-hidden rounded-[18%]"
        style={{ left: pct(906, W), top: pct(92, H), width: pct(66, W), height: pct(88, H) }}
      >
        <PassengerHead seed="en-jordi" size={60} />
      </div>
      <ul aria-label="Seients" className="contents">
        {Array.from({ length: FRAME * 2 }, (_, i) => (
          <li
            key={i}
            className="absolute grid place-items-center overflow-hidden rounded-[22%]"
            style={{ ...seatBox(i), background: look.night ? '#6E6AA8' : '#BFE6FF' }}
          >
            {seat(i)}
          </li>
        ))}
      </ul>
      <Wipers />
      {children}
    </motion.div>
  )
}

/** A passenger in a window, scaled to the window (no interaction). */
export function SeatFace({ seed }: { seed: string }) {
  return (
    <span className="absolute inset-x-0 bottom-0 flex h-full items-end justify-center [&>svg]:h-[96%] [&>svg]:w-auto">
      <PassengerHead seed={seed} size={60} />
    </span>
  )
}
