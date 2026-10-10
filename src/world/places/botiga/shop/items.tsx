import { PALETTE as P } from '../../../art/palette'
import { PROPS_BY_ID } from '../../../art/props'
import type { InteractableDef } from '../../../sandbox/defs'
import { BallArt, Contact } from '../../../sandbox/art/foodArt'
import { PRODUCTS } from '../products'

/** A library prop drawn inside the 100-wide art box of a sandbox object (feet at the bottom). */
function Prop({ id }: { id: string }) {
  const def = PROPS_BY_ID[id]
  if (!def) return null
  const k = 100 / Math.max(def.w, def.h)
  return (
    <g>
      <Contact rx={30} />
      <g transform={`translate(${50 - (def.w * k) / 2} ${100 - def.h * k}) scale(${k})`}>{def.render({})}</g>
    </g>
  )
}

const HEIGHT: Readonly<Record<string, number>> = { poma: 0.1, platan: 0.09, taronja: 0.1, croissant: 0.09, llet: 0.13, 'barra-pa': 0.08 }

const productDefs: readonly InteractableDef[] = PRODUCTS.map((p) => ({
  id: p.id,
  label: `${p.gender === 'f' ? 'la' : 'el'} ${p.one}`,
  height: HEIGHT[p.id] ?? 0.1,
  pickup: true,
  art: () => <Prop id={p.id} />,
}))

/** A wooden crate of produce: tap to open, the goods are inside until the child carries them off. */
function CrateArt({ open, tint }: { open: boolean; tint: string }) {
  return (
    <g>
      <Contact rx={44} />
      <rect x="4" y="40" width="92" height="54" rx="8" fill={P.xocolata.shade} />
      <rect x="4" y="36" width="92" height="54" rx="8" fill={P.xocolata.light} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="10" y={44 + i * 14} width="80" height="8" rx="3" fill={P.xocolata.base} />
      ))}
      <rect x="4" y="30" width="92" height="12" rx="6" fill={P.xocolata.base} />
      {open ? <ellipse cx="50" cy="28" rx="40" ry="8" fill={tint} /> : <rect x="8" y="14" width="84" height="16" rx="6" fill={P.xocolata.shade} transform="rotate(-3 50 22)" />}
    </g>
  )
}

/** The scale: the number on its screen is filled in by the place (it reads what lies on it). */
function ScaleArt() {
  return (
    <g>
      <Contact rx={40} />
      <rect x="14" y="60" width="72" height="34" rx="12" fill={P.menta.shade} />
      <rect x="14" y="56" width="72" height="34" rx="12" fill={P.menta.base} />
      <rect x="28" y="62" width="44" height="14" rx="5" fill={P.llima.light} />
      <ellipse cx="50" cy="48" rx="40" ry="9" fill={P.neu.shade} />
      <ellipse cx="50" cy="45" rx="40" ry="9" fill={P.neu.base} />
    </g>
  )
}

function ParcelArt() {
  return (
    <g>
      <Contact rx={38} />
      <rect x="10" y="30" width="80" height="62" rx="8" fill="#C98D5E" />
      <rect x="10" y="26" width="80" height="62" rx="8" fill="#E9B07C" />
      <rect x="44" y="26" width="12" height="62" fill={P.mango.base} opacity="0.85" />
      <rect x="18" y="40" width="20" height="12" rx="3" fill="#fff" opacity="0.8" />
    </g>
  )
}

export const SHOP_DEFS: readonly InteractableDef[] = [
  ...productDefs,
  { id: 'caixa-pomes', label: 'la caixa de pomes', aspect: 1, height: 0.2, container: true, art: (s) => <CrateArt open={s.open} tint={P.coral.base} /> },
  { id: 'caixa-fruita', label: 'la caixa de fruita', aspect: 1, height: 0.2, container: true, art: (s) => <CrateArt open={s.open} tint={P.mango.base} /> },
  { id: 'caixa-fred', label: 'la caixa del fred', aspect: 1, height: 0.2, container: true, art: (s) => <CrateArt open={s.open} tint={P.cel.light} /> },
  { id: 'bascula', label: 'la bàscula', height: 0.11, art: () => <ScaleArt /> },
  { id: 'paquet', label: 'el paquet', height: 0.12, pickup: true, art: () => <ParcelArt /> },
  { id: 'pilota', label: 'la pilota', height: 0.12, pickup: true, toss: true, art: () => <BallArt /> },
  {
    id: 'ou-sorpresa',
    label: 'el prestatge sorpresa',
    height: 0.14,
    surprise: true,
    surpriseTaps: 3,
    surpriseOptions: ['un pollet', 'una estrella', 'un cor'],
    art: (s) => <ParcelArtSurprise charge={s.charge} revealed={s.revealed} />,
  },
]

function ParcelArtSurprise({ charge, revealed }: { charge: number; revealed: string | undefined }) {
  return (
    <g>
      <ParcelArt />
      {revealed === undefined && charge > 0.3 && <path d="M30 30 L40 44 L32 56" stroke={P.carbo.base} strokeWidth="3" fill="none" strokeLinecap="round" />}
      {revealed !== undefined && <path d="M50 4 L58 24 L78 24 L62 36 L68 56 L50 44 L32 56 L38 36 L22 24 L42 24Z" fill={P.mango.base} />}
    </g>
  )
}
