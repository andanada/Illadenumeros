import { PALETTE as P } from '../../art/palette'

/**
 * The arcade's front on the street: a purple building with a neon sign, a window full of glowing screens and a
 * star on the door. Same flat, no-outline look as the other façades; it fills whatever box the street gives it.
 */
export function RecreatiusFacade({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 320 330" className="block h-full w-full" preserveAspectRatio="xMidYMax meet" aria-hidden="true" data-open={open}>
      <rect x={10} y={40} width={300} height={290} rx={16} fill={P.lila.base} />
      <path d="M262 46 L310 56 L310 314 Q310 330 294 330 L262 330 Z" fill={P.lila.shade} opacity={0.5} />
      <rect x={30} y={0} width={260} height={64} rx={20} fill={P.carbo.base} />
      <text
        x={160}
        y={44}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight={700}
        fontSize={31}
        letterSpacing={2}
        fill={P.rosa.base}
      >
        RECREATIUS
      </text>
      {[44, 80, 116, 152, 188, 224, 260].map((x, i) => (
        <circle key={x} cx={x + 6} cy={78} r={5} fill={i % 2 ? P.mango.light : P.mango.base} />
      ))}
      <rect x={26} y={104} width={186} height={176} rx={14} fill={P.neu.base} />
      <rect x={34} y={112} width={170} height={160} rx={10} fill={P.carbo.base} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${42 + i * 54} 124)`}>
          <rect width={46} height={110} rx={8} fill={[P.cel.base, P.coral.base, P.menta.base][i]} />
          <rect x={5} y={8} width={36} height={34} rx={5} fill={[P.cel.light, P.mango.light, P.llima.light][i]} />
          <circle cx={14} cy={62} r={4.5} fill={P.mango.base} />
          <circle cx={30} cy={62} r={4.5} fill={P.rosa.base} />
          <rect x={10} y={80} width={26} height={8} rx={4} fill={P.carbo.base} opacity={0.5} />
        </g>
      ))}
      <path d="M44 128 l22 -6" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.5} />
      <rect x={224} y={170} width={76} height={160} rx={12} fill={P.neu.base} />
      <rect x={232} y={178} width={60} height={152} rx={8} fill={P.carbo.light} />
      <path d="M262 206 l5 11 12 1.2 -9 8 2.6 12 -10.6 -6.2 -10.6 6.2 2.6 -12 -9 -8 12 -1.2z" fill={P.mango.base} />
      <circle cx={282} cy={290} r={4.5} fill={P.mango.base} />
    </svg>
  )
}
