import type { ReactNode } from 'react'
import { PALETTE as P } from '../../../art/palette'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { useBusLook } from './busLook'

/**
 * The town gliding past the bus windows: sky, far hills, houses and the near pavement each scroll at their
 * own speed (parallax) while the bus drives. Every layer is two copies of one tile moved by a CSS animation
 * that only pauses, so stopping and starting never jumps. With reduced motion the landscape never scrolls.
 */
const KEYFRAMES = '@keyframes bus-scroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }'

function ScrollLayer({
  seconds,
  running,
  className = '',
  children,
}: {
  seconds: number
  running: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`absolute inset-x-0 overflow-hidden ${className}`}>
      <div
        className="flex h-full w-[200%]"
        style={{ animation: `bus-scroll ${seconds}s linear infinite`, animationPlayState: running ? 'running' : 'paused' }}
      >
        <div className="h-full w-1/2">{children}</div>
        <div className="h-full w-1/2">{children}</div>
      </div>
    </div>
  )
}

function Hills({ night }: { night: boolean }) {
  const far = night ? '#3E5E73' : P.llima.light
  const near = night ? '#355247' : '#BFDC74'
  return (
    <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="h-full w-full">
      <path d="M0 120 Q120 40 260 100 Q380 150 520 80 Q660 20 800 96 Q900 140 1000 120 V200 H0 Z" fill={far} />
      <path d="M0 160 Q160 110 330 150 Q480 180 640 130 Q820 90 1000 160 V200 H0 Z" fill={near} />
    </svg>
  )
}

const HOUSES = [
  { x: 20, w: 120, h: 130, c: P.rosa.base, roof: P.coral.shade },
  { x: 170, w: 90, h: 170, c: P.cel.base, roof: P.cel.shade },
  { x: 290, w: 140, h: 110, c: P.menta.base, roof: P.menta.shade },
  { x: 470, w: 100, h: 150, c: P.lila.base, roof: P.lila.shade },
  { x: 600, w: 130, h: 120, c: P.mango.base, roof: P.coral.base },
  { x: 760, w: 90, h: 180, c: P.coral.light, roof: P.coral.shade },
  { x: 880, w: 100, h: 130, c: P.llima.base, roof: P.llima.shade },
]

function Houses({ night }: { night: boolean }) {
  const glass = night ? '#FFE9A0' : '#BFE6FF'
  return (
    <svg viewBox="0 0 1000 200" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
      {HOUSES.map((h) => (
        <g key={h.x} opacity={night ? 0.8 : 1}>
          <rect x={h.x} y={200 - h.h} width={h.w} height={h.h} rx={10} fill={h.c} />
          <rect x={h.x - 6} y={200 - h.h - 14} width={h.w + 12} height={20} rx={9} fill={h.roof} />
          {[0, 1].map((r) =>
            [0, 1].map((col) => (
              <rect
                key={`${r}-${col}`}
                x={h.x + 16 + col * (h.w / 2)}
                y={200 - h.h + 18 + r * 46}
                width={h.w / 2 - 30}
                height={28}
                rx={6}
                fill={glass}
              />
            )),
          )}
        </g>
      ))}
    </svg>
  )
}

function Pavement({ night }: { night: boolean }) {
  return (
    <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="h-full w-full">
      {[90, 420, 760].map((x) => (
        <g key={x}>
          <rect x={x} y={10} width={8} height={100} rx={4} fill={P.carbo.light} />
          <circle cx={x + 4} cy={12} r={14} fill={night ? '#FFF3B0' : P.mango.light} />
        </g>
      ))}
      {[250, 600, 920].map((x) => (
        <g key={x}>
          <rect x={x - 5} y={50} width={10} height={60} rx={4} fill={P.xocolata.base} />
          <circle cx={x} cy={44} r={34} fill={night ? '#3F7D6B' : P.llima.base} />
          <circle cx={x - 10} cy={34} r={10} fill={night ? '#4E9280' : P.llima.light} />
        </g>
      ))}
    </svg>
  )
}

/** Sky, hills, houses and lamp posts behind everything (decorative). */
export function StreetBackdrop() {
  const look = useBusLook()
  const reduced = useWorldReducedMotion()
  const running = look.driving && !reduced
  const night = look.night
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      data-testid="bus-backdrop"
      data-scrolling={running}
    >
      <style>{KEYFRAMES}</style>
      <div
        className="absolute inset-0"
        style={{ background: night ? 'linear-gradient(#2F2A5A, #4C3F7D)' : 'linear-gradient(#8FD3FF, #D7F0FF)' }}
      />
      {night ? (
        <>
          <div
            className="absolute right-[12%] top-[16%] size-16 rounded-full"
            style={{ background: '#FFF3B0', boxShadow: '0 0 40px #FFF3B0' }}
          />
          {[8, 22, 37, 55, 70, 88].map((x, i) => (
            <span key={x} className="absolute size-1.5 rounded-full bg-white" style={{ left: `${x}%`, top: `${12 + (i % 3) * 7}%` }} />
          ))}
        </>
      ) : (
        <div className="absolute right-[12%] top-[16%] size-20 rounded-full" style={{ background: P.mango.light }} />
      )}
      <ScrollLayer seconds={60} running={running} className="bottom-[38%] h-[22%]">
        <Hills night={night} />
      </ScrollLayer>
      <ScrollLayer seconds={24} running={running} className="bottom-[26%] h-[26%]">
        <Houses night={night} />
      </ScrollLayer>
      <div className="absolute inset-x-0 bottom-0 h-[27%]" style={{ background: night ? '#6F5A8E' : P.neu.shade }} />
      <ScrollLayer seconds={8} running={running} className="bottom-[20%] h-[16%]">
        <Pavement night={night} />
      </ScrollLayer>
    </div>
  )
}

/** The road under the bus: asphalt with lane dashes that rush past while driving. */
export function RoadStrip({ className = '' }: { className?: string }) {
  const look = useBusLook()
  const reduced = useWorldReducedMotion()
  const running = look.driving && !reduced
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 overflow-hidden ${className}`}
      aria-hidden="true"
      style={{ background: look.night ? '#3B3656' : '#5B5672' }}
    >
      <div className="absolute inset-x-0 top-0 h-2.5" style={{ background: look.night ? '#8C7BAE' : '#E4D9C6' }} />
      <ScrollLayer seconds={2.5} running={running} className="top-1/2 h-2 -translate-y-1/2">
        <div
          className="h-full w-full"
          style={{ background: `repeating-linear-gradient(90deg, ${P.neu.base} 0 48px, transparent 48px 96px)` }}
        />
      </ScrollLayer>
    </div>
  )
}
