import { INK, PALETTE as P } from '../../../art/palette'
import { PROPS_BY_ID } from '../../../art/props'
import { Contact } from '../../../sandbox/art/foodArt'

/** Library art of each piece (cents); the two smallest coins are drawn here, as the library has none. */
const PROP_OF: Readonly<Record<number, string>> = { 5: 'moneda-5c', 10: 'moneda-10c', 20: 'moneda-20c', 50: 'moneda-50c', 100: 'moneda-1', 200: 'moneda-2', 500: 'bitllet-5', 1000: 'bitllet-10', 2000: 'bitllet-20' }

/** Every piece the cashier tray knows, smallest first. */
export const PIECES = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000] as const

export const pieceId = (cents: number): string => `peca-${cents}`
export const centsOfPiece = (defId: string): number | undefined => (defId.startsWith('peca-') ? Number(defId.slice(5)) : undefined)

export const pieceLabel = (cents: number): string => {
  if (cents >= 500) return `el bitllet de ${cents / 100} euros`
  return cents >= 100 ? `la moneda de ${cents / 100} ${cents === 100 ? 'euro' : 'euros'}` : `la moneda de ${cents} cèntims`
}

export const pieceSingle = (cents: number): string => {
  if (cents >= 500) return `un bitllet de ${cents / 100} euros`
  return cents >= 100 ? `una moneda de ${cents / 100} ${cents === 100 ? 'euro' : 'euros'}` : `una moneda de ${cents} ${cents === 1 ? 'cèntim' : 'cèntims'}`
}

function SmallCopper({ cents }: { cents: number }) {
  return (
    <g>
      <circle cx="50" cy="62" r="25" fill="#B4683A" />
      <circle cx="50" cy="58" r="25" fill="#D98A55" />
      <path d="M36 50 A18 18 0 0 1 56 40" stroke="#F0B48A" strokeWidth="5" strokeLinecap="round" fill="none" />
      <text x="50" y="68" fontSize="26" textAnchor="middle" fill={P.carbo.base} style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
        {cents}
      </text>
    </g>
  )
}

/** One coin or note of the cashier tray, drawn from the shop's own money art, feet at the bottom of a 100 box. */
export function MoneyArt({ cents }: { cents: number }) {
  const id = PROP_OF[cents]
  const def = id ? PROPS_BY_ID[id] : undefined
  if (!def) {
    return (
      <g>
        <Contact rx={22} />
        <SmallCopper cents={cents} />
      </g>
    )
  }
  const width = cents >= 500 ? 96 : 40 + def.w * 1.3
  const k = width / def.w
  return (
    <g>
      <Contact rx={Math.min(40, width / 2.4)} />
      <ellipse cx="50" cy="96" rx="1" ry="1" fill={INK.shadow} opacity="0" />
      <g transform={`translate(${50 - width / 2} ${100 - def.h * k - 4}) scale(${k})`}>{def.render({})}</g>
    </g>
  )
}
