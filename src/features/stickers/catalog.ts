import { STICKER_DATA } from './catalogData'

export const RARITIES = ['comuna', 'rara', 'epica', 'llegendaria'] as const
export type Rarity = (typeof RARITIES)[number]

export const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  comuna: 'Comuna',
  rara: 'Rara',
  epica: 'Èpica',
  llegendaria: 'Llegendària',
}

/** How a sticker is won: random chests of the games, the daily challenge, or completing a series. */
export type StickerSource = 'joc' | 'repte' | 'serie'

export interface Sticker {
  id: string
  emoji: string
  name: string
  series: string
  rarity: Rarity
  source: StickerSource
}

export interface StickerSeries {
  id: string
  title: string
  emoji: string
}

/** Album pages, in order. Each series has a final "master" badge sticker (id `serie-<id>`) won by completing it. */
export const SERIES: readonly StickerSeries[] = [
  { id: 'bosc', title: 'Bosc dels Comptes', emoji: '🌲' },
  { id: 'platja', title: 'Platja de les Desenes', emoji: '🏖️' },
  { id: 'castell', title: 'Fleca-Castell', emoji: '🏰' },
  { id: 'animals', title: 'Animals amics', emoji: '🦁' },
  { id: 'espai', title: 'Viatge a l’espai', emoji: '🚀' },
  { id: 'dolcos', title: 'Dolços i llaminadures', emoji: '🍰' },
  { id: 'mar', title: 'Fons del mar', emoji: '🐙' },
  { id: 'robots', title: 'Robots i invents', emoji: '🤖' },
  { id: 'repte', title: 'Reptes diaris', emoji: '🏆' },
]

export const STICKERS: readonly Sticker[] = STICKER_DATA

export const stickerById = (id: string): Sticker | undefined => STICKERS.find((s) => s.id === id)

/** Stickers of a series that can be collected one by one (the master badge excluded). */
export const regularOf = (seriesId: string): Sticker[] => STICKERS.filter((s) => s.series === seriesId && s.source !== 'serie')

export const badgeOf = (seriesId: string): Sticker | undefined => STICKERS.find((s) => s.series === seriesId && s.source === 'serie')

/** Relative chance of a rarity in a random chest. */
export const RARITY_WEIGHT: Readonly<Record<Rarity, number>> = { comuna: 8, rara: 4, epica: 2, llegendaria: 0 }
