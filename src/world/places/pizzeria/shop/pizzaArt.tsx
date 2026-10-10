import { PALETTE as P } from '../../../art/palette'
import { Contact } from '../../../sandbox/art/foodArt'
import { sliceSpan } from '../pizza/cutLogic'

const CRUST = '#E6A857'
const CRUST_DARK = '#C9843A'
const SAUCE = '#E8503F'
const CHEESE = '#FFD66B'

/** A point on the pizza's circle (centre 50,56; the pizza is drawn in perspective: squashed vertically). */
const onCircle = (deg: number, r: number): { x: number; y: number } => ({ x: 50 + Math.sin((deg * Math.PI) / 180) * r, y: 56 - Math.cos((deg * Math.PI) / 180) * r * 0.55 })

const PEPPERONI: readonly (readonly [number, number])[] = [
  [20, 0.5],
  [95, 0.62],
  [165, 0.45],
  [235, 0.6],
  [300, 0.5],
  [0, 0.12],
]

function Pepperoni({ from = 0, to = 360 }: { from?: number; to?: number }) {
  return (
    <>
      {PEPPERONI.filter(([deg]) => deg >= from && deg < to).map(([deg, r]) => {
        const p = onCircle(deg, r * 44)
        return <ellipse key={deg} cx={p.x} cy={p.y} rx="6.5" ry="3.6" fill={P.coral.shade} />
      })}
    </>
  )
}

/** The pizza dough through its stages (base, sauce, cheese, toppings) or baked. */
export function PizzaArt({ stage, baked = false }: { stage: string; baked?: boolean }) {
  const topped = stage === 'amb-tomaquet' || stage === 'amb-formatge' || stage === 'feta'
  const cheese = stage === 'amb-formatge' || stage === 'feta'
  if (stage === 'massa') {
    return (
      <g>
        <Contact rx={30} />
        <ellipse cx="50" cy="70" rx="28" ry="22" fill="#DDB877" />
        <ellipse cx="50" cy="66" rx="28" ry="22" fill="#F3D9A4" />
        <ellipse cx="40" cy="58" rx="9" ry="5" fill="#fff" opacity="0.45" />
      </g>
    )
  }
  return (
    <g>
      <Contact rx={46} />
      <ellipse cx="50" cy="66" rx="46" ry="26" fill={CRUST_DARK} />
      <ellipse cx="50" cy="60" rx="46" ry="26" fill={baked ? CRUST_DARK : CRUST} />
      <ellipse cx="50" cy="60" rx="38" ry="20.5" fill={baked ? '#F2B65A' : '#F6D9A0'} />
      {topped && <ellipse cx="50" cy="60" rx="35" ry="18.5" fill={SAUCE} />}
      {cheese && <ellipse cx="50" cy="59" rx="32" ry="16.5" fill={CHEESE} />}
      {cheese && <path d="M26 58 Q36 52 44 58 M52 52 Q62 48 72 56 M40 68 Q54 72 66 66" stroke="#FFEBA8" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {stage === 'feta' && <Pepperoni />}
      {baked && <Pepperoni />}
      {baked && (
        <g stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.85">
          <path d="M40 30 Q34 22 42 14" />
          <path d="M60 28 Q54 20 62 12" />
        </g>
      )}
    </g>
  )
}

/** One slice of a pizza (a wedge seen in perspective). */
export function SliceArt() {
  return (
    <g>
      <Contact rx={26} />
      <path d="M50 88 L10 38 Q50 22 90 38Z" fill={CRUST_DARK} />
      <path d="M50 82 L16 38 Q50 26 84 38Z" fill={CHEESE} />
      <path d="M16 38 Q50 26 84 38 L82 44 Q50 32 18 44Z" fill={CRUST} />
      <ellipse cx="42" cy="50" rx="6" ry="3.4" fill={P.coral.shade} />
      <ellipse cx="60" cy="58" rx="5.5" ry="3.2" fill={P.coral.shade} />
    </g>
  )
}

/** A whole pizza in a box, lid open: used for deliveries. */
export function PizzaBoxArt() {
  return (
    <g>
      <Contact rx={40} />
      <rect x="8" y="46" width="84" height="44" rx="6" fill="#C98D5E" />
      <rect x="8" y="42" width="84" height="44" rx="6" fill="#E9B07C" />
      <circle cx="30" cy="64" r="8" fill={P.coral.base} opacity="0.9" />
      <rect x="42" y="56" width="40" height="6" rx="3" fill="#fff" opacity="0.8" />
      <rect x="42" y="68" width="30" height="6" rx="3" fill="#fff" opacity="0.6" />
    </g>
  )
}

export function SauceArt() {
  return (
    <g>
      <Contact rx={30} />
      <path d="M26 40 H74 L68 90 H32Z" fill={P.neu.base} />
      <path d="M28 52 H72 L68 90 H32Z" fill={SAUCE} />
      <rect x="22" y="30" width="56" height="14" rx="7" fill={P.neu.shade} />
      <rect x="44" y="6" width="12" height="26" rx="5" fill={P.carbo.light} />
    </g>
  )
}

export function CheeseArt() {
  return (
    <g>
      <Contact rx={32} />
      <path d="M10 76 L50 30 L90 76Z" fill={CHEESE} />
      <rect x="10" y="76" width="80" height="14" rx="3" fill="#E8B83C" />
      {[
        [48, 60],
        [64, 72],
        [34, 72],
      ].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="4.5" fill="#E8B83C" />)}
    </g>
  )
}

export function PepperoniBowlArt() {
  return (
    <g>
      <Contact rx={32} />
      <path d="M12 52 H88 Q86 90 50 92 Q14 90 12 52Z" fill={P.cel.shade} />
      <ellipse cx="50" cy="52" rx="38" ry="9" fill={P.cel.light} />
      {[30, 46, 62, 74].map((x, i) => <ellipse key={x} cx={x} cy={50 - (i % 2) * 3} rx="9" ry="4.6" fill={P.coral.shade} />)}
    </g>
  )
}

/** Slicing wheels of 2, 3, 4, 6 or 8: the number is on the handle. */
export function CutterArt({ parts }: { parts: number }) {
  return (
    <g>
      <Contact rx={30} />
      <rect x="44" y="52" width="12" height="40" rx="6" fill={P.xocolata.base} />
      <circle cx="50" cy="38" r="26" fill={P.neu.shade} />
      <circle cx="50" cy="38" r="22" fill="#fff" />
      <circle cx="50" cy="38" r="6" fill={P.carbo.light} />
      <text x="50" y="82" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff" fontFamily="var(--font-display)" stroke={P.xocolata.shade} strokeWidth="0.1">
        {parts}
      </text>
      {Array.from({ length: Math.min(parts, 8) }, (_, i) => {
        const a = sliceSpan(parts, i).from
        const x = 50 + Math.sin((a * Math.PI) / 180) * 21
        const y = 38 - Math.cos((a * Math.PI) / 180) * 21
        return <line key={a} x1="50" y1="38" x2={x} y2={y} stroke={P.carbo.light} strokeWidth="1.8" />
      })}
    </g>
  )
}

export function DoughBinArt({ open }: { open: boolean }) {
  return (
    <g>
      <Contact rx={42} />
      <rect x="10" y="40" width="80" height="52" rx="10" fill={P.neu.shade} />
      <rect x="10" y="36" width="80" height="52" rx="10" fill={P.neu.base} />
      <rect x="10" y="30" width="80" height="12" rx="6" fill={P.cel.base} />
      {open ? <ellipse cx="50" cy="28" rx="36" ry="8" fill="#F3D9A4" /> : <rect x="8" y="14" width="84" height="16" rx="7" fill={P.cel.shade} transform="rotate(-3 50 22)" />}
    </g>
  )
}

export function CoinArt() {
  return (
    <g>
      <Contact rx={20} />
      <ellipse cx="50" cy="78" rx="26" ry="8" fill={P.mango.shade} />
      <ellipse cx="50" cy="72" rx="26" ry="8" fill={P.mango.base} />
      <ellipse cx="50" cy="72" rx="17" ry="4.5" fill={P.mango.light} />
    </g>
  )
}
