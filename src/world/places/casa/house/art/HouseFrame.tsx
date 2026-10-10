import { PALETTE as P } from '../../../../art/palette'

/** The outside of the dollhouse: sky, a tiled roof with a chimney on top, and the grass at the bottom. */
export function HouseFrame({ roofH, groundH, night }: { roofH: number; groundH: number; night: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0" style={{ background: night ? 'linear-gradient(#2b2548, #3b3470)' : 'linear-gradient(#bfe6ff, #e6f6ff)' }} />
      <svg className="absolute inset-x-0 top-0 w-full" height={roofH + 6} viewBox="0 0 1000 100" preserveAspectRatio="none">
        <rect x="690" y="2" width="56" height="50" rx="6" fill={P.xocolata.shade} />
        <rect x="684" y="0" width="68" height="12" rx="5" fill={P.xocolata.base} />
        <path d="M0 100 L0 88 L500 6 L1000 88 L1000 100 Z" fill={P.coral.base} />
        <path d="M0 100 L0 94 L500 14 L1000 94 L1000 100 Z" fill={P.coral.shade} opacity="0.28" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <path key={i} d={`M${i * 90} 100 q45 -14 90 0`} stroke={P.coral.light} strokeWidth="2.4" fill="none" opacity="0.45" />
        ))}
        <rect x="0" y="94" width="1000" height="6" fill={P.xocolata.base} />
      </svg>
      <div className="absolute inset-x-0 bottom-0" style={{ height: groundH }}>
        <div className="absolute inset-0" style={{ background: night ? '#25503f' : P.llima.base }} />
        <div className="absolute inset-x-0 top-0 h-3" style={{ background: night ? '#2c5e4b' : P.llima.light }} />
        <div className="absolute inset-x-0 top-0 h-2" style={{ background: P.xocolata.shade }} />
      </div>
    </div>
  )
}
