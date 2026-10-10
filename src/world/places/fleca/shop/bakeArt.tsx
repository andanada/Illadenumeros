import { PALETTE as P } from '../../../art/palette'
import { Contact } from '../../../sandbox/art/foodArt'

const DOUGH = '#F3D9A4'
const DOUGH_SHADE = '#DDB877'
const CRUST = '#D9893F'
const CRUST_LIGHT = '#EDA95E'

function Steam() {
  return (
    <g stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.85">
      <path d="M38 30 Q32 20 40 12" />
      <path d="M58 26 Q52 16 60 8" />
    </g>
  )
}

/** Raw dough shaped for each product, in its three stages: ball, rolled out, shaped. */
export function DoughArt({ kind, stage }: { kind: 'magdalena' | 'croissant' | 'baguette'; stage: string }) {
  if (stage === 'massa') {
    return (
      <g>
        <Contact rx={30} />
        <ellipse cx="50" cy="66" rx="30" ry="26" fill={DOUGH_SHADE} />
        <ellipse cx="50" cy="62" rx="30" ry="26" fill={DOUGH} />
        <ellipse cx="40" cy="52" rx="9" ry="6" fill="#fff" opacity="0.45" />
      </g>
    )
  }
  if (stage === 'estesa') {
    return (
      <g>
        <Contact rx={42} />
        <ellipse cx="50" cy="84" rx="44" ry="12" fill={DOUGH_SHADE} />
        <ellipse cx="50" cy="80" rx="44" ry="12" fill={DOUGH} />
        <ellipse cx="34" cy="76" rx="12" ry="3" fill="#fff" opacity="0.45" />
      </g>
    )
  }
  if (kind === 'croissant') {
    return (
      <g>
        <Contact rx={38} />
        <path d="M8 80 Q14 40 50 34 Q86 40 92 80 Q74 66 50 66 Q26 66 8 80Z" fill={DOUGH_SHADE} />
        <path d="M10 76 Q18 42 50 38 Q82 42 90 76 Q72 62 50 62 Q28 62 10 76Z" fill={DOUGH} />
        {[30, 42, 58, 70].map((x) => (
          <path key={x} d={`M${x} 46 Q${x + 2} 54 ${x - 2} 62`} stroke={DOUGH_SHADE} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        ))}
      </g>
    )
  }
  if (kind === 'baguette') {
    return (
      <g>
        <Contact rx={44} />
        <rect x="4" y="56" width="92" height="30" rx="15" fill={DOUGH_SHADE} />
        <rect x="4" y="52" width="92" height="30" rx="15" fill={DOUGH} />
        {[22, 42, 62, 80].map((x) => (
          <path key={x} d={`M${x} 60 l9 -6`} stroke={DOUGH_SHADE} strokeWidth="4" strokeLinecap="round" />
        ))}
      </g>
    )
  }
  return (
    <g>
      <Contact rx={30} />
      <path d="M22 50 H78 L72 88 H28Z" fill={P.rosa.light} />
      <path d="M22 50 H78 L74 70 H26Z" fill={P.rosa.base} opacity="0.5" />
      <path d="M20 50 Q22 22 50 20 Q78 22 80 50Z" fill={DOUGH} />
      <ellipse cx="40" cy="36" rx="8" ry="5" fill="#fff" opacity="0.4" />
    </g>
  )
}

export function MuffinArt({ stage, hot = false }: { stage: string; hot?: boolean }) {
  const iced = stage === 'glassa' || stage === 'fideus'
  return (
    <g>
      <Contact rx={30} />
      <path d="M22 54 H78 L72 90 H28Z" fill={P.rosa.light} />
      {[34, 46, 58, 68].map((x) => (
        <path key={x} d={`M${x} 56 L${x - 1} 88`} stroke={P.rosa.base} strokeWidth="3" opacity="0.55" />
      ))}
      <path d="M18 56 Q16 26 50 24 Q84 26 82 56Z" fill={CRUST} />
      <path d="M26 44 Q34 30 48 30" stroke={CRUST_LIGHT} strokeWidth="5" fill="none" strokeLinecap="round" />
      {iced && <path d="M20 50 Q18 30 50 30 Q82 30 80 50 Q70 56 60 48 Q50 58 40 48 Q30 56 20 50Z" fill={P.neu.light} />}
      {iced && <path d="M20 50 Q30 56 40 48 Q50 58 60 48 Q70 56 80 50 L80 54 Q70 60 60 52 Q50 62 40 52 Q30 60 20 54Z" fill={P.rosa.base} opacity="0.35" />}
      {stage === 'fideus' &&
        [
          [34, 38, P.coral.base],
          [48, 34, P.cel.base],
          [62, 38, P.llima.base],
          [42, 45, P.mango.base],
          [58, 46, P.lila.base],
        ].map(([x, y, c]) => <rect key={`${x}${y}`} x={Number(x)} y={Number(y)} width="9" height="3.6" rx="1.8" fill={String(c)} transform={`rotate(${(Number(x) * 7) % 70} ${Number(x)} ${Number(y)})`} />)}
      {hot && <Steam />}
    </g>
  )
}

export function CroissantArt({ hot = false }: { hot?: boolean }) {
  return (
    <g>
      <Contact rx={38} />
      <path d="M6 82 Q12 36 50 30 Q88 36 94 82 Q74 66 50 66 Q26 66 6 82Z" fill="#B96F2C" />
      <path d="M8 78 Q16 40 50 34 Q84 40 92 78 Q72 62 50 62 Q28 62 8 78Z" fill={CRUST} />
      {[28, 41, 59, 72].map((x) => (
        <path key={x} d={`M${x} 42 Q${x + 2} 52 ${x - 2} 62`} stroke="#B96F2C" strokeWidth="4" fill="none" strokeLinecap="round" />
      ))}
      <path d="M30 42 Q42 34 56 36" stroke={CRUST_LIGHT} strokeWidth="5" fill="none" strokeLinecap="round" />
      {hot && <Steam />}
    </g>
  )
}

export function BaguetteArt({ hot = false }: { hot?: boolean }) {
  return (
    <g>
      <Contact rx={44} />
      <rect x="2" y="54" width="96" height="32" rx="16" fill="#B96F2C" />
      <rect x="2" y="50" width="96" height="32" rx="16" fill={CRUST} />
      {[20, 40, 60, 80].map((x) => (
        <path key={x} d={`M${x} 60 l10 -7`} stroke={CRUST_LIGHT} strokeWidth="5" strokeLinecap="round" />
      ))}
      {hot && <Steam />}
    </g>
  )
}

export function RollingPinArt() {
  return (
    <g>
      <Contact rx={34} />
      <g transform="rotate(-18 50 62)">
        <rect x="8" y="56" width="16" height="10" rx="5" fill={P.xocolata.base} />
        <rect x="76" y="56" width="16" height="10" rx="5" fill={P.xocolata.base} />
        <rect x="20" y="46" width="60" height="30" rx="14" fill={P.xocolata.light} />
        <rect x="26" y="50" width="40" height="6" rx="3" fill="#fff" opacity="0.35" />
      </g>
    </g>
  )
}

export function ShaperArt() {
  return (
    <g>
      <Contact rx={30} />
      <path d="M20 84 Q18 40 50 28 Q82 40 80 84Z" fill={P.cel.shade} />
      <path d="M26 82 Q26 46 50 36 Q74 46 74 82Z" fill={P.cel.light} />
      <rect x="40" y="10" width="20" height="22" rx="8" fill={P.cel.base} />
    </g>
  )
}

export function IcingArt() {
  return (
    <g>
      <Contact rx={30} />
      <path d="M50 8 L74 90 H26Z" fill={P.rosa.base} />
      <path d="M50 8 L62 50 L38 50Z" fill={P.rosa.light} />
      <circle cx="50" cy="12" r="6" fill={P.neu.light} />
    </g>
  )
}

export function SprinklesArt() {
  return (
    <g>
      <Contact rx={28} />
      <rect x="28" y="30" width="44" height="58" rx="12" fill={P.neu.base} />
      <rect x="32" y="48" width="36" height="26" rx="6" fill={P.cel.light} />
      <rect x="32" y="16" width="36" height="16" rx="8" fill={P.mango.base} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={38 + i * 7} y={54 + (i % 2) * 8} width="7" height="3" rx="1.5" fill={[P.coral.base, P.llima.base, P.mango.base, P.lila.base][i]} />
      ))}
    </g>
  )
}

/** A wooden crate holding balls of dough. */
export function DoughCrateArt({ open }: { open: boolean }) {
  return (
    <g>
      <Contact rx={44} />
      <rect x="4" y="40" width="92" height="54" rx="8" fill={P.xocolata.shade} />
      <rect x="4" y="36" width="92" height="54" rx="8" fill={P.xocolata.light} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="10" y={44 + i * 14} width="80" height="8" rx="3" fill={P.xocolata.base} />
      ))}
      <rect x="4" y="30" width="92" height="12" rx="6" fill={P.xocolata.base} />
      {open ? <ellipse cx="50" cy="28" rx="40" ry="8" fill={DOUGH} /> : <rect x="8" y="14" width="84" height="16" rx="6" fill={P.xocolata.shade} transform="rotate(-3 50 22)" />}
    </g>
  )
}
