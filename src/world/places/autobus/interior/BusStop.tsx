import type { ReactNode } from 'react'
import { PALETTE as P } from '../../../art/palette'
import { RoadStrip } from './StreetBackdrop'

/**
 * The bus stop on the pavement: a glass shelter with its round BUS sign. The people waiting stand in front
 * of it (children), the first in line nearest the bus.
 */
export function BusStop({
  label,
  more = 0,
  children,
  className = '',
}: {
  label: string
  more?: number
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`relative flex min-h-24 items-end justify-end ${className}`}>
      <svg
        viewBox="0 0 220 260"
        className="pointer-events-none absolute bottom-0 left-0 h-full w-auto max-w-full"
        preserveAspectRatio="xMinYMax meet"
        aria-hidden="true"
      >
        <rect x={20} y={56} width={10} height={204} rx={5} fill={P.carbo.light} />
        <rect x={150} y={56} width={10} height={204} rx={5} fill={P.carbo.light} />
        <rect x={30} y={74} width={120} height={140} rx={8} fill="#BFE6FF" opacity={0.6} />
        <path d="M44 92 l30 -10 M44 108 l18 -6" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
        <rect x={6} y={40} width={168} height={30} rx={13} fill={P.cel.base} />
        <rect x={6} y={60} width={168} height={10} rx={5} fill={P.cel.shade} />
        <rect x={190} y={60} width={8} height={200} rx={4} fill={P.carbo.light} />
        <circle cx={194} cy={42} r={26} fill={P.neu.base} />
        <circle cx={194} cy={42} r={20} fill={P.cel.base} />
        <text x={194} y={49} fontSize={17} textAnchor="middle" fill={P.neu.light} fontFamily="var(--font-display)" fontWeight={700}>
          BUS
        </text>
      </svg>
      <div role="group" aria-label={label} className="relative flex items-end justify-end pr-1">
        {children}
      </div>
      {more > 0 && (
        <span
          aria-hidden="true"
          className="absolute left-1 top-1 grid size-10 place-items-center rounded-full bg-white text-lg font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-soft)]"
        >
          +{more}
        </span>
      )}
    </div>
  )
}

/**
 * The stop and the bus on the road. Landscape: the stop on the pavement at the left, the bus beside it.
 * Portrait: the bus takes the whole width (bigger windows) and the stop waits in front of it.
 */
export function BusRow({ stop, bus, portrait }: { stop: ReactNode; bus: ReactNode; portrait: boolean }) {
  if (portrait) {
    return (
      <div className="relative flex flex-col gap-1">
        <div className="relative pb-3">
          <RoadStrip className="bottom-0 h-6" />
          <div className="relative pb-1">{bus}</div>
        </div>
        {stop}
      </div>
    )
  }
  return (
    <div className="relative mx-auto flex w-full max-w-[44rem] items-end gap-2 pb-4">
      <RoadStrip className="bottom-0 h-8" />
      <div className="w-[26%] shrink-0">{stop}</div>
      <div className="min-w-0 flex-1 pb-2">{bus}</div>
    </div>
  )
}
