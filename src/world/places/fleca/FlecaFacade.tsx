import { PALETTE as P } from '../../art/palette'

/**
 * The bakery's front on the street: a rose building with a striped awning, a window full of bread and a door with
 * a croissant sign. Flat shapes, no outlines, like the other façades; it fills whatever box the street gives it.
 */
export function FlecaFacade({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 320 330" className="block h-full w-full" preserveAspectRatio="xMidYMax meet" aria-hidden="true" data-open={open}>
      <rect x={10} y={40} width={300} height={290} rx={16} fill={P.rosa.base} />
      <path d="M262 46 L310 56 L310 314 Q310 330 294 330 L262 330 Z" fill={P.rosa.shade} opacity={0.5} />
      <rect x={50} y={0} width={220} height={56} rx={16} fill={P.mango.base} />
      <text x={160} y={39} textAnchor="middle" fontFamily="var(--font-display)" fontWeight={700} fontSize={30} letterSpacing={2} fill={P.carbo.base}>
        FLECA
      </text>
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} d={`M${20 + i * 40} 76 L${60 + i * 40} 76 L${60 + i * 40} 112 Q${40 + i * 40} 132 ${20 + i * 40} 112 Z`} fill={i % 2 ? P.neu.base : P.coral.base} />
      ))}
      <rect x={30} y={150} width={164} height={130} rx={12} fill={P.neu.base} />
      <rect x={38} y={158} width={148} height={114} rx={8} fill={P.cel.light} />
      <rect x={38} y={214} width={148} height={6} fill={P.xocolata.light} />
      <rect x={38} y={254} width={148} height={6} fill={P.xocolata.light} />
      {[60, 100, 140].map((x) => (
        <rect key={x} x={x - 22} y={190} width={44} height={24} rx={12} fill="#D9893F" />
      ))}
      {[56, 90, 124, 158].map((x, i) => (
        <g key={x}>
          <path d={`M${x - 12} 240 H${x + 12} L${x + 9} 254 H${x - 9}Z`} fill={P.rosa.light} />
          <path d={`M${x - 13} 240 Q${x - 12} 226 ${x} 226 Q${x + 12} 226 ${x + 13} 240Z`} fill={i % 2 ? '#D9893F' : '#EDA95E'} />
        </g>
      ))}
      <path d="M48 170 l22 -8" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.75} />
      <rect x={206} y={188} width={86} height={142} rx={12} fill={P.neu.base} />
      <rect x={214} y={196} width={70} height={134} rx={8} fill={P.xocolata.light} />
      <rect x={222} y={206} width={54} height={66} rx={6} fill={P.cel.light} />
      <path d="M232 248 Q236 230 249 228 Q262 230 266 248 Q258 242 249 242 Q240 242 232 248Z" fill="#D9893F" />
      <circle cx={270} cy={290} r={4.5} fill={P.mango.base} />
    </svg>
  )
}
