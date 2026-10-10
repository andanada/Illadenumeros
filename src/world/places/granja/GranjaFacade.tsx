import { PALETTE as P } from '../../art/palette'

/** The farm's front on the street: a red barn with a round window, a sign and a hen on the roof. */
export function GranjaFacade({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 320 330" className="block h-full w-full" preserveAspectRatio="xMidYMax meet" aria-hidden="true" data-open={open}>
      <rect x={20} y={110} width={280} height={220} rx={12} fill={P.coral.base} />
      <path d="M244 116 L300 116 L300 316 Q300 330 286 330 L244 330 Z" fill={P.coral.shade} opacity={0.5} />
      <path d="M0 122 L160 14 L320 122 Z" fill={P.coral.shade} />
      <path d="M40 122 L160 40 L280 122 Z" fill={P.coral.base} opacity={0.5} />
      <circle cx={160} cy={84} r={20} fill={P.neu.base} />
      <circle cx={160} cy={84} r={12} fill={P.cel.light} />
      <rect x={70} y={140} width={180} height={34} rx={17} fill={P.neu.base} />
      <text x={160} y={165} textAnchor="middle" fontFamily="var(--font-display)" fontWeight={700} fontSize={25} letterSpacing={3} fill={P.coral.shade}>
        GRANJA
      </text>
      <rect x={60} y={196} width={200} height={134} rx={8} fill={P.neu.base} />
      <path d="M60 196 L260 330 M260 196 L60 330" stroke={P.coral.base} strokeWidth={9} />
      <rect x={60} y={196} width={200} height={134} rx={8} fill="none" stroke={P.coral.base} strokeWidth={9} />
      <path d="M262 128 q10 -14 22 -4 q8 -10 14 4 q-16 6 -36 0Z" fill={P.mango.base} />
      <circle cx={34} cy={316} r={12} fill={P.llima.base} />
      <circle cx={54} cy={322} r={9} fill={P.llima.shade} />
    </svg>
  )
}
