import type { CharacterId, ThemeColor } from '../../core/storage/db'
import type { AvatarSpec, CatalogEntry, PaletteColor } from '../model/types'
import { ACCESSORIES } from './kit/accessories'
import { BOTTOMS } from './kit/bottoms'
import { HAIR } from './kit/hair'
import { SHOES } from './kit/shoes'
import { TOPS } from './kit/tops'

/**
 * Wardrobe catalogue. Every drawable wearable has exactly one entry (enforced by tests).
 * Price 0 = starter set, owned by everybody (includes every part used by defaultAvatar, and all hair:
 * hair is identity, never paywalled). Everything else costs 5–60 monedes.
 */
const PRICES: Readonly<Record<string, number>> = {
  'samarreta-ratlles': 10,
  camisa: 15,
  tirants: 8,
  jaqueta: 30,
  impermeable: 35,
  bermudes: 12,
  'faldilla-volants': 20,
  peto: 25,
  'pantalons-campana': 22,
  sandalies: 10,
  'botes-pluja': 18,
  sabatilles: 8,
  'barret-sol': 25,
  'gorro-llana': 15,
  corona: 60,
  ulleres: 12,
  'ulleres-sol': 20,
  flor: 6,
}

const price = (id: string): number => PRICES[id] ?? 0

const entries = (kind: CatalogEntry['kind'], parts: readonly { id: string; name: string }[]): CatalogEntry[] =>
  parts.map((p) => ({ id: p.id, kind, name: p.name, price: kind === 'hair' ? 0 : price(p.id) }))

export const WEARABLES: readonly CatalogEntry[] = [
  ...entries('hair', HAIR),
  ...entries('top', TOPS),
  ...entries('bottom', BOTTOMS),
  ...entries('shoes', SHOES),
  ...entries('accessory', ACCESSORIES),
]

export const WEARABLES_BY_ID: Readonly<Record<string, CatalogEntry>> = Object.fromEntries(WEARABLES.map((w) => [w.id, w]))

/** Ids everybody owns from day one. */
export const STARTER_WEARABLES: readonly string[] = WEARABLES.filter((w) => w.price === 0).map((w) => w.id)

/** The app's old theme colours mapped to the town palette. */
export const THEME_TO_PALETTE: Readonly<Record<ThemeColor, PaletteColor>> = {
  lila: 'lila',
  rosa: 'rosa',
  blau: 'cel',
  menta: 'menta',
  taronja: 'mango',
  negre: 'carbo',
}

type Look = Omit<AvatarSpec, 'skin' | 'top'> & { top: string }

/** Each old mascot becomes a style: the child keeps "her" character's personality in the new avatar. */
const LOOKS: Readonly<Record<CharacterId, Look>> = {
  nyx: {
    hair: { style: 'cabell-bob', color: 'carbo' },
    eyes: 'ulls-pestanyes',
    mouth: 'boca-llengua',
    top: 'dessuadora',
    bottom: { item: 'malles', color: 'carbo' },
    shoes: { item: 'botes', color: 'carbo' },
    accessory: { item: 'auriculars', color: 'rosa' },
  },
  mixa: {
    hair: { style: 'cabell-cues', color: 'xocolata' },
    eyes: 'ulls-brillants',
    mouth: 'boca-gat',
    top: 'samarreta-cor',
    bottom: { item: 'faldilla', color: 'lila' },
    shoes: { item: 'sabates', color: 'lila' },
    accessory: { item: 'diadema-gat', color: 'neu' },
  },
  blau: {
    hair: { style: 'cabell-curt', color: 'xocolata' },
    eyes: 'ulls-punt',
    mouth: 'boca-rialla',
    top: 'samarreta-estel',
    bottom: { item: 'pantalons-curts', color: 'carbo' },
    shoes: { item: 'bambes', color: 'coral' },
    accessory: { item: 'gorra', color: 'cel' },
  },
  nuvol: {
    hair: { style: 'cabell-arrissat', color: 'mango' },
    eyes: 'ulls-ovals',
    mouth: 'boca-somriure',
    top: 'jersei',
    bottom: { item: 'texans', color: 'cel' },
    shoes: { item: 'bambes', color: 'neu' },
    accessory: null,
  },
  melo: {
    hair: { style: 'cabell-monyo', color: 'xocolata' },
    eyes: 'ulls-punt',
    mouth: 'boca-dents',
    top: 'vestit',
    bottom: { item: 'malles', color: 'neu' },
    shoes: { item: 'sabates', color: 'rosa' },
    accessory: { item: 'llac', color: 'rosa' },
  },
}

/** Starting avatar for an existing or new player, from the profile's character and theme colour. */
export function defaultAvatar(character: CharacterId, color: ThemeColor): AvatarSpec {
  const look = LOOKS[character]
  const main = THEME_TO_PALETTE[color]
  const topColor: PaletteColor = main === look.hair.color ? 'neu' : main
  return {
    skin: 's2',
    hair: { ...look.hair },
    eyes: look.eyes,
    mouth: look.mouth,
    top: { item: look.top, color: topColor },
    bottom: { ...look.bottom },
    shoes: { ...look.shoes },
    accessory: look.accessory ? { ...look.accessory } : null,
  }
}
