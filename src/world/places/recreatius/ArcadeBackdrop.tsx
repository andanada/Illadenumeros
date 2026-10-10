import { PALETTE as P } from '../../art/palette'

const KEYFRAMES =
  '@keyframes arcade-bulb { 0%, 100% { opacity: 1 } 50% { opacity: 0.25 } } .arcade-bulb { animation: arcade-bulb 1s ease-in-out infinite }'

/** A neon sign of the room (the lights going out dims it). */
function Neon({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 420 70" className="absolute left-1/2 top-[11%] h-10 -translate-x-1/2 sm:h-12" aria-hidden="true">
      <rect x={4} y={4} width={412} height={62} rx={31} fill={P.carbo.base} opacity={0.88} />
      <text
        x={210}
        y={46}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight={700}
        fontSize={36}
        letterSpacing={6}
        fill={lit ? '#FF8DBA' : '#8A6A86'}
        style={lit ? { filter: 'drop-shadow(0 0 6px #FF8DBA)' } : undefined}
      >
        RECREATIUS
      </text>
    </svg>
  )
}

/**
 * The arcade's room: dark-blue walls with confetti-star wallpaper, a carpet in squares, a neon sign.
 * Decorative only. With the lights off it gets darker (cabinets keep glowing).
 */
export function ArcadeBackdrop({ lit, floorTop = 0.74 }: { lit: boolean; floorTop?: number }) {
  const wall = lit ? '#5B4C9E' : '#2F2A5A'
  const wall2 = lit ? '#5445A0' : '#2A2552'
  const carpet = lit ? '#8E6BD4' : '#4A3C80'
  const carpet2 = lit ? '#7F5BC8' : '#40336F'
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-testid="arcade-backdrop" data-lit={lit}>
      <style>{KEYFRAMES}</style>
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="arcade-wall" width="72" height="72" patternUnits="userSpaceOnUse">
            <rect width="72" height="72" fill={wall} />
            <rect width="36" height="72" fill={wall2} />
            <path d="M18 14 l3 7 7.5 .8 -5.6 5 1.7 7.4 -6.6 -3.9 -6.6 3.9 1.7 -7.4 -5.6 -5 7.5 -.8z" fill={P.mango.base} opacity={0.5} />
            <circle cx={54} cy={50} r={4} fill={P.menta.base} opacity={0.55} />
            <circle cx={46} cy={20} r={2.5} fill={P.rosa.base} opacity={0.6} />
          </pattern>
          <pattern id="arcade-carpet" width="80" height="80" patternUnits="userSpaceOnUse">
            <rect width="80" height="80" fill={carpet} />
            <rect width="40" height="40" fill={carpet2} />
            <rect x="40" y="40" width="40" height="40" fill={carpet2} />
            <circle cx={60} cy={20} r={4} fill={P.rosa.base} opacity={0.5} />
            <circle cx={20} cy={60} r={4} fill={P.cel.base} opacity={0.5} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#arcade-wall)" />
      </svg>
      <div className="absolute inset-x-0 bottom-0" style={{ top: `${floorTop * 100}%` }}>
        <div className="absolute inset-x-0 -top-3 h-3" style={{ background: P.carbo.base }} />
        <svg className="h-full w-full">
          <rect width="100%" height="100%" fill="url(#arcade-carpet)" />
        </svg>
      </div>
      <Neon lit={lit} />
      {!lit && <div className="absolute inset-0" style={{ background: 'rgba(20,16,50,0.28)' }} />}
    </div>
  )
}
