import { INK, PALETTE as P } from '../../art/palette'
import { Contact } from './foodArt'

/** Fridge in a 100 × 167 box. Closed: a plain door with a handle. Open: the door swings and the shelves show. */
export function FridgeArt({ open }: { open: boolean }) {
  return (
    <g>
      <ellipse cx="50" cy="162" rx="46" ry="6" fill={INK.shadow} opacity="0.16" />
      <rect x="6" y="4" width="88" height="158" rx="14" fill={P.menta.shade} />
      {open ? (
        <g>
          <rect x="12" y="10" width="76" height="146" rx="8" fill="#fff8e8" />
          {[44, 80, 116].map((y) => (
            <g key={y}>
              <rect x="12" y={y} width="76" height="5" fill={P.cel.light} />
              <rect x="12" y={y + 5} width="76" height="3" fill={P.cel.base} opacity="0.25" />
            </g>
          ))}
          <ellipse cx="50" cy="28" rx="26" ry="9" fill="#fff" opacity="0.9" />
          <path d="M6 4 L-20 20 L-20 150 L6 162Z" fill={P.menta.base} />
          <path d="M6 4 L-20 20 L-20 150 L6 162Z" fill="#fff" opacity="0.12" />
          <rect x="-14" y="70" width="5" height="26" rx="2.5" fill={P.neu.base} />
        </g>
      ) : (
        <g>
          <rect x="6" y="2" width="88" height="156" rx="14" fill={P.menta.base} />
          <rect x="6" y="2" width="22" height="156" rx="12" fill="#fff" opacity="0.14" />
          <rect x="6" y="52" width="88" height="4" fill={P.menta.shade} opacity="0.55" />
          <rect x="74" y="20" width="7" height="24" rx="3.5" fill={P.neu.base} />
          <rect x="74" y="68" width="7" height="40" rx="3.5" fill={P.neu.base} />
          <path d="M26 86 C14 80 16 70 26 76 C36 70 38 80 26 86Z" fill={P.coral.base} />
          <rect x="38" y="84" width="22" height="16" rx="3" fill={P.mango.base} transform="rotate(-6 49 92)" />
        </g>
      )}
    </g>
  )
}

const CHICK = (
  <g>
    <circle cx="50" cy="52" r="24" fill={P.mango.base} />
    <circle cx="50" cy="50" r="24" fill={P.mango.light} />
    <circle cx="42" cy="46" r="3.4" fill={INK.face} />
    <circle cx="58" cy="46" r="3.4" fill={INK.face} />
    <path d="M45 54 L55 54 L50 62Z" fill={P.coral.base} />
    <path d="M50 26 Q46 16 52 12 M50 26 Q56 18 60 20" stroke={P.mango.base} strokeWidth="3.4" strokeLinecap="round" fill="none" />
  </g>
)

/** The surprise egg: shakes more as taps add up; at the end it pops open and shows what was hiding. */
export function EggArt({ charge, revealed }: { charge: number; revealed: string | undefined }) {
  if (revealed !== undefined) {
    return (
      <g>
        <Contact rx={34} />
        <path d="M18 80 Q50 98 82 80 L74 66 L64 78 L50 62 L36 78 L26 66Z" fill={P.lila.light} />
        <path d="M18 80 Q50 98 82 80 L78 86 Q50 100 22 86Z" fill={P.lila.base} />
        <g transform="translate(0 -14)">
          {revealed.includes('pollet') && CHICK}
          {revealed.includes('estrella') && <path d="M50 12 L58 36 L84 36 L63 52 L71 76 L50 62 L29 76 L37 52 L16 36 L42 36Z" fill={P.mango.base} />}
          {revealed.includes('cor') && <path d="M50 78 C14 52 30 14 50 36 C70 14 86 52 50 78Z" fill={P.coral.base} />}
        </g>
      </g>
    )
  }
  return (
    <g>
      <Contact rx={28} />
      <path d="M50 8 C24 8 14 52 16 70 C18 90 34 96 50 96 C66 96 82 90 84 70 C86 52 76 8 50 8Z" fill={P.lila.shade} />
      <path d="M50 6 C26 6 16 50 18 68 C20 86 34 92 50 92 C66 92 80 86 82 68 C84 50 74 6 50 6Z" fill={P.lila.light} />
      {[
        [38, 30, 6],
        [60, 44, 5],
        [42, 62, 6],
        [66, 74, 4],
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={r} fill={P.rosa.base} />
      ))}
      <ellipse cx="34" cy="28" rx="5" ry="10" fill="#fff" opacity="0.55" transform="rotate(16 34 28)" />
      {charge > 0.3 && <path d="M40 40 L48 48 L42 56 L52 64" stroke={P.lila.shade} strokeWidth="2.6" fill="none" strokeLinecap="round" />}
      {charge > 0.6 && <path d="M62 30 L56 40 L64 46" stroke={P.lila.shade} strokeWidth="2.6" fill="none" strokeLinecap="round" />}
    </g>
  )
}
