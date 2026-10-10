import { PALETTE as P } from '../../art/palette'

/**
 * The pizzeria's front on the street: a red building with a checked awning, a round window with a pizza in it and
 * a door with a scooter parked beside. Flat shapes, no outlines; it fills whatever box the street gives it.
 */
export function PizzeriaFacade({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 320 330" className="block h-full w-full" preserveAspectRatio="xMidYMax meet" aria-hidden="true" data-open={open}>
      <rect x={10} y={40} width={300} height={290} rx={16} fill={P.coral.base} />
      <path d="M262 46 L310 56 L310 314 Q310 330 294 330 L262 330 Z" fill={P.coral.shade} opacity={0.5} />
      <rect x={40} y={0} width={240} height={58} rx={18} fill={P.neu.base} />
      <text x={160} y={39} textAnchor="middle" fontFamily="var(--font-display)" fontWeight={700} fontSize={30} letterSpacing={2} fill={P.coral.shade}>
        PIZZERIA
      </text>
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M${20 + i * 35} 76 H${55 + i * 35} V108 Q${37.5 + i * 35} 126 ${20 + i * 35} 108Z`} fill={i % 2 ? P.neu.base : P.llima.base} />
      ))}
      <circle cx={104} cy={216} r={70} fill={P.neu.base} />
      <circle cx={104} cy={216} r={60} fill={P.cel.light} />
      <circle cx={104} cy={222} r={36} fill="#C9843A" />
      <circle cx={104} cy={222} r={30} fill="#FFD66B" />
      {[
        [92, 212],
        [114, 226],
        [100, 236],
        [118, 206],
      ].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={6.5} fill={P.coral.shade} />)}
      <path d="M62 190 l24 -10" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.75} />
      <rect x={206} y={188} width={86} height={142} rx={12} fill={P.neu.base} />
      <rect x={214} y={196} width={70} height={134} rx={8} fill={P.xocolata.light} />
      <rect x={222} y={206} width={54} height={66} rx={6} fill={P.cel.light} />
      <path d="M232 262 Q249 226 266 262Z" fill="#FFD66B" />
      <circle cx={270} cy={290} r={4.5} fill={P.mango.base} />
    </svg>
  )
}
