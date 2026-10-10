import { PALETTE as P } from '../../art/palette'

/** The market's front on the street: a striped awning over a fruit stall, a sign with a decimal price and a discount tag. */
export function MercatFacade({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 320 330" className="block h-full w-full" preserveAspectRatio="xMidYMax meet" aria-hidden="true" data-open={open}>
      <rect x={20} y={150} width={14} height={180} fill={P.xocolata.base} />
      <rect x={286} y={150} width={14} height={180} fill={P.xocolata.base} />
      <rect x={20} y={252} width={280} height={78} rx={10} fill={P.xocolata.light} />
      <rect x={20} y={252} width={280} height={18} rx={8} fill={P.xocolata.base} />
      <path d="M0 150 L40 60 L280 60 L320 150 Z" fill={P.menta.base} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <path key={i} d={`M${i * 40} 150 L${40 + i * 30} 60 L${70 + i * 30} 60 L${40 + i * 40} 150 Z`} fill={i % 2 ? P.neu.base : P.menta.base} />
      ))}
      <path d="M0 150 q20 24 40 0 q20 24 40 0 q20 24 40 0 q20 24 40 0 q20 24 40 0 q20 24 40 0 q20 24 40 0 q20 24 40 0" fill={P.menta.shade} />
      <rect x={60} y={14} width={200} height={50} rx={16} fill={P.mango.base} />
      <text x={160} y={48} textAnchor="middle" fontFamily="var(--font-display)" fontWeight={700} fontSize={30} letterSpacing={3} fill={P.carbo.base}>
        MERCAT
      </text>
      <rect x={96} y={176} width={128} height={34} rx={10} fill={P.neu.base} />
      <text x={160} y={200} textAnchor="middle" fontFamily="var(--font-display)" fontWeight={700} fontSize={19} fill={P.carbo.base}>
        0,50 € / kg
      </text>
      <g transform="translate(250 226) rotate(10)">
        <rect x={-26} y={-14} width={52} height={28} rx={8} fill={P.coral.base} />
        <circle cx={-18} cy={0} r={3.5} fill={P.neu.base} />
        <text x={6} y={6} textAnchor="middle" fontFamily="var(--font-display)" fontWeight={700} fontSize={16} fill={P.neu.base}>
          −25 %
        </text>
      </g>
      {[52, 92, 132, 172].map((x, i) => (
        <circle key={x} cx={x} cy={246} r={15} fill={[P.coral.base, P.mango.base, P.llima.base, P.coral.light][i]} />
      ))}
    </svg>
  )
}
