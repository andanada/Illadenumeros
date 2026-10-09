import { PALETTE as P } from '../art/palette'

/** A wrapped present, flat and outline-free like the rest of the town. `open` lifts the lid. Decorative. */
export function GiftBox({ size = 120, open = false }: { size?: number; open?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" className="block shrink-0" style={{ overflow: 'visible' }}>
      <ellipse cx="60" cy="112" rx="44" ry="7" fill="#2B2440" opacity="0.14" />
      <rect x="18" y="52" width="84" height="58" rx="10" fill={P.coral.base} />
      <rect x="18" y="52" width="84" height="12" fill={P.coral.shade} opacity="0.5" />
      <rect x="53" y="52" width="14" height="58" fill={P.mango.base} />
      <g transform={open ? 'translate(8 -26) rotate(-18 60 46)' : undefined}>
        <rect x="12" y="38" width="96" height="20" rx="8" fill={P.coral.light} />
        <rect x="53" y="38" width="14" height="20" fill={P.mango.light} />
        <path d="M60 38 C44 18 26 26 36 36 C40 40 52 39 60 38 Z" fill={P.mango.base} />
        <path d="M60 38 C76 18 94 26 84 36 C80 40 68 39 60 38 Z" fill={P.mango.shade} />
        <circle cx="60" cy="37" r="6" fill={P.mango.light} />
      </g>
      {open &&
        [
          [24, 30, P.cel.base],
          [96, 24, P.menta.base],
          [40, 12, P.lila.base],
          [84, 6, P.rosa.base],
        ].map(([x, y, c]) => <circle key={`${x}-${y}`} cx={x as number} cy={y as number} r="5" fill={c as string} />)}
    </svg>
  )
}
