import { INK, PALETTE as P } from '../../../art/palette'
import { Contact } from '../../../sandbox/art/foodArt'

/** Seed on the soil (the first stage of a plant, and the loose seeds of a request). */
export function SeedArt() {
  return (
    <g>
      <Contact rx={24} />
      <ellipse cx="50" cy="84" rx="28" ry="10" fill="#7A4A30" />
      <path d="M50 30 C30 40 30 78 50 88 C70 78 70 40 50 30Z" fill="#E9C27C" />
      <path d="M50 30 C70 40 70 78 50 88 C58 70 58 48 50 30Z" fill="#D2A257" />
      <path d="M50 30 V20 M50 24 q-8 -8 -14 -4 q6 8 14 4Z" stroke={P.llima.shade} strokeWidth="4" strokeLinecap="round" fill={P.llima.base} />
    </g>
  )
}

/** A plant in its growing stages: seed, watered mound, sprout, ripe carrot. */
export function PlantArt({ stage }: { stage: string }) {
  if (stage === 'llavor') return <SeedArt />
  if (stage === 'regada') {
    return (
      <g>
        <Contact rx={26} />
        <ellipse cx="50" cy="84" rx="32" ry="12" fill="#5C3620" />
        {[34, 50, 66].map((x) => (
          <path key={x} d={`M${x} 40 q-5 10 0 16 q5 -6 0 -16Z`} fill={P.cel.base} />
        ))}
      </g>
    )
  }
  if (stage === 'brot') {
    return (
      <g>
        <Contact rx={26} />
        <ellipse cx="50" cy="86" rx="30" ry="10" fill="#7A4A30" />
        <path d="M50 84 L50 50" stroke={P.llima.shade} strokeWidth="6" strokeLinecap="round" />
        <path d="M50 58 C26 56 22 36 30 28 C44 30 52 42 50 58Z" fill={P.llima.base} />
        <path d="M50 52 C72 50 78 30 70 22 C56 24 48 36 50 52Z" fill={P.llima.light} />
      </g>
    )
  }
  return (
    <g>
      <Contact rx={26} />
      <path d="M50 24 C34 12 28 30 40 36 M50 24 C50 6 60 6 62 18 M50 24 C66 10 76 26 62 34" stroke={P.llima.shade} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M32 40 Q50 32 68 40 Q62 70 50 94 Q38 70 32 40Z" fill={P.coral.base} />
      <path d="M40 48 q10 -4 20 0 M42 62 q8 -3 14 0" stroke={P.coral.shade} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </g>
  )
}

export function WateringCanArt() {
  return (
    <g>
      <Contact rx={30} />
      <rect x="22" y="40" width="46" height="46" rx="10" fill={P.cel.base} />
      <rect x="22" y="40" width="14" height="46" rx="7" fill={P.cel.shade} opacity="0.6" />
      <path d="M68 52 L92 30 L96 36 L72 66Z" fill={P.cel.shade} />
      <path d="M26 44 Q46 12 64 44" stroke={P.cel.shade} strokeWidth="6" fill="none" strokeLinecap="round" />
      <ellipse cx="94" cy="32" rx="6" ry="9" fill={P.cel.light} />
    </g>
  )
}

export function FertiliserArt() {
  return (
    <g>
      <Contact rx={30} />
      <path d="M26 30 Q50 20 74 30 L80 90 Q50 98 20 90Z" fill={P.mango.base} />
      <path d="M26 30 Q50 20 74 30 L76 44 Q50 36 24 44Z" fill={P.mango.shade} />
      <circle cx="50" cy="64" r="14" fill={P.neu.base} />
      <path d="M50 72 V58 M50 58 q-8 -2 -8 -8 q8 0 8 8 M50 62 q8 -2 8 -8 q-8 0 -8 8" stroke={P.llima.shade} strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  )
}

/** A scoop of grain for the animals. */
export function GrainArt() {
  return (
    <g>
      <Contact rx={22} />
      <path d="M26 56 Q50 44 74 56 L68 90 Q50 96 32 90Z" fill={P.xocolata.light} />
      <path d="M30 56 Q50 38 70 56 Q50 50 30 56Z" fill={P.mango.base} />
      {[38, 50, 62].map((x, i) => (
        <ellipse key={x} cx={x} cy={46 - (i % 2) * 5} rx="5" ry="7" fill={P.mango.light} transform={`rotate(${(i - 1) * 24} ${x} 46)`} />
      ))}
    </g>
  )
}

export function EggArt({ shade = 0 }: { shade?: number }) {
  return (
    <g>
      <Contact rx={20} />
      <path d="M50 26 C28 26 24 66 34 82 C42 94 58 94 66 82 C76 66 72 26 50 26Z" fill={shade ? P.neu.shade : P.neu.base} />
      <path d="M38 42 C34 52 34 62 38 70" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.8" />
    </g>
  )
}

export function HenArt() {
  return (
    <g>
      <Contact rx={32} />
      <path d="M18 54 C14 30 40 18 58 30 C74 32 84 50 80 66 C76 86 56 92 38 88 C24 84 20 68 18 54Z" fill={P.neu.base} />
      <path d="M62 46 C84 46 92 64 78 78 C70 66 64 58 62 46Z" fill={P.neu.shade} />
      <path d="M44 22 q4 -12 10 -2 q6 -10 8 4 q-10 4 -18 -2Z" fill={P.coral.base} />
      <path d="M18 46 L6 50 L18 56Z" fill={P.mango.base} />
      <circle cx="28" cy="44" r="3" fill={INK.face} />
      <path d="M40 88 V96 M54 88 V96" stroke={P.mango.shade} strokeWidth="4" strokeLinecap="round" />
    </g>
  )
}

/** A hessian sack or a wicker crate; open ones show a heap of what is inside. */
export function SackArt({ open, tint }: { open: boolean; tint: string }) {
  return (
    <g>
      <Contact rx={40} />
      <path d="M18 34 Q50 24 82 34 L90 92 Q50 100 10 92Z" fill={P.xocolata.light} />
      <path d="M18 34 Q50 24 82 34 L84 46 Q50 38 16 46Z" fill={P.xocolata.base} />
      {open ? <ellipse cx="50" cy="30" rx="30" ry="9" fill={tint} /> : <path d="M34 34 Q50 12 66 34Z" fill={P.xocolata.base} />}
    </g>
  )
}

export function NestArt({ open }: { open: boolean }) {
  return (
    <g>
      <Contact rx={40} />
      <ellipse cx="50" cy="78" rx="42" ry="16" fill={P.mango.shade} />
      <ellipse cx="50" cy="72" rx="42" ry="16" fill={P.mango.base} />
      {open && <ellipse cx="50" cy="68" rx="30" ry="9" fill={P.mango.light} />}
      {[16, 28, 40, 52, 64, 76].map((x) => (
        <path key={x} d={`M${x} 62 q8 12 16 0`} stroke={P.mango.shade} strokeWidth="3" fill="none" />
      ))}
    </g>
  )
}

/** An art box drawn small, for bubbles. */
export function Mini({ children, size = 30 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg viewBox="6 20 88 80" width={size} height={size} aria-hidden="true">
      {children}
    </svg>
  )
}
