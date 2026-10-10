import { PALETTE as P } from '../../../../art/palette'

/** The window: sunny hills by day, a moon and stars by night. */
export function HomeWindow({ night, className = '' }: { night: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 200 170" className={className} aria-hidden="true">
      <rect x="0" y="0" width="200" height="160" rx="16" fill={P.neu.base} />
      <rect x="12" y="12" width="176" height="136" rx="10" fill={night ? '#3B3470' : '#A9DCFF'} />
      {night ? (
        <>
          <circle cx="140" cy="46" r="16" fill={P.mango.light} />
          <circle cx="148" cy="40" r="14" fill="#3B3470" />
          {[
            [40, 34],
            [70, 60],
            [104, 30],
            [168, 86],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="#FFF3B0" />
          ))}
          <path d="M12 116 Q70 92 120 108 Q160 118 188 100 L188 148 L12 148 Z" fill="#2E5C55" />
        </>
      ) : (
        <>
          <circle cx="150" cy="42" r="16" fill={P.mango.light} />
          <path d="M12 116 Q70 92 120 108 Q160 118 188 100 L188 148 L12 148 Z" fill={P.llima.light} />
          <rect x="40" y="90" width="8" height="28" rx="3" fill={P.xocolata.base} />
          <circle cx="44" cy="84" r="16" fill={P.llima.base} />
        </>
      )}
      <rect x="96" y="12" width="8" height="136" fill={P.neu.base} />
      <path d="M12 12 L58 12 Q44 70 26 148 L12 148 Z" fill={P.rosa.light} />
      <path d="M188 12 L142 12 Q156 70 174 148 L188 148 Z" fill={P.rosa.light} />
      <rect x="-6" y="148" width="212" height="14" rx="6" fill={P.xocolata.light} />
    </svg>
  )
}
