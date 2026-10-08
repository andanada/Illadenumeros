import { PALETTE_COLORS, SKIN_TONES, type AvatarSpec, type PaletteColor } from '../model/types'
import { pick, rng, between } from '../art/random'
import { ACCESSORIES } from './kit/accessories'
import { BOTTOMS } from './kit/bottoms'
import { EYES, MOUTHS } from './kit/face'
import { HAIR } from './kit/hair'
import { SHOES } from './kit/shoes'
import { TOPS } from './kit/tops'

/**
 * Townspeople, built from the very same kit as the player's avatar. Eight hand-tuned presets with names
 * and roles, plus `neighbourFromSeed` for crowds (bus passengers, shop queue): same seed, same person.
 */
export interface NeighbourPreset {
  id: string
  name: string
  /** Short Catalan role, used by speech bubbles and accessible names. */
  role: string
  spec: AvatarSpec
  /** 0.9–1.25, grown-ups are taller. */
  stature: number
}

const w = (item: string, color: PaletteColor) => ({ item, color })

export const NEIGHBOURS: readonly NeighbourPreset[] = [
  {
    id: 'senyora-pilar',
    name: 'Senyora Pilar',
    role: 'la botiguera',
    stature: 1.18,
    spec: { skin: 's2', hair: { style: 'cabell-monyo', color: 'neu' }, eyes: 'ulls-punt', mouth: 'boca-somriure', top: w('camisa', 'menta'), bottom: w('faldilla', 'xocolata'), shoes: w('sabates', 'carbo'), accessory: w('ulleres', 'coral') },
  },
  {
    id: 'en-jordi',
    name: 'En Jordi',
    role: 'el conductor del bus',
    stature: 1.22,
    spec: { skin: 's5', hair: { style: 'cabell-rapat', color: 'carbo' }, eyes: 'ulls-mandrosos', mouth: 'boca-dents', top: w('jaqueta', 'cel'), bottom: w('pantalons', 'carbo'), shoes: w('botes', 'xocolata'), accessory: w('gorra', 'cel') },
  },
  {
    id: 'la-nuria',
    name: 'La Núria',
    role: 'la perruquera',
    stature: 1.15,
    spec: { skin: 's3', hair: { style: 'cabell-llarg', color: 'lila' }, eyes: 'ulls-pestanyes', mouth: 'boca-rialla', top: w('tirants', 'rosa'), bottom: w('pantalons-campana', 'cel'), shoes: w('sandalies', 'mango'), accessory: w('flor', 'mango') },
  },
  {
    id: 'en-pau',
    name: 'En Pau',
    role: 'el forner',
    stature: 1.2,
    spec: { skin: 's1', hair: { style: 'cabell-curt', color: 'mango' }, eyes: 'ulls-alegres', mouth: 'boca-somriure', top: w('samarreta', 'neu'), bottom: w('peto', 'coral'), shoes: w('bambes', 'carbo'), accessory: null },
  },
  {
    id: 'la-fatima',
    name: 'La Fàtima',
    role: 'la veïna del tercer',
    stature: 1.12,
    spec: { skin: 's4', hair: { style: 'cabell-trenes', color: 'carbo' }, eyes: 'ulls-brillants', mouth: 'boca-timida', top: w('vestit', 'mango'), bottom: w('malles', 'lila'), shoes: w('sabates', 'coral'), accessory: w('llac', 'lila') },
  },
  {
    id: 'l-avi-ramon',
    name: "L'avi Ramon",
    role: 'el jardiner',
    stature: 1.08,
    spec: { skin: 's2', hair: { style: 'cabell-rapat', color: 'neu' }, eyes: 'ulls-mandrosos', mouth: 'boca-somriure', top: w('jersei', 'llima'), bottom: w('pantalons', 'xocolata'), shoes: w('sabatilles', 'coral'), accessory: w('barret-sol', 'mango') },
  },
  {
    id: 'en-kofi',
    name: 'En Kofi',
    role: 'un nen del barri',
    stature: 1,
    spec: { skin: 's6', hair: { style: 'cabell-arrissat', color: 'carbo' }, eyes: 'ulls-ovals', mouth: 'boca-llengua', top: w('samarreta-ratlles', 'coral'), bottom: w('bermudes', 'cel'), shoes: w('bambes', 'llima'), accessory: null },
  },
  {
    id: 'la-mei',
    name: 'La Mei',
    role: 'una nena del barri',
    stature: 0.96,
    spec: { skin: 's1', hair: { style: 'cabell-cua', color: 'carbo' }, eyes: 'ulls-estel', mouth: 'boca-oh', top: w('impermeable', 'mango'), bottom: w('pantalons', 'lila'), shoes: w('botes-pluja', 'coral'), accessory: null },
  },
]

export const NEIGHBOURS_BY_ID: Readonly<Record<string, NeighbourPreset>> = Object.fromEntries(NEIGHBOURS.map((n) => [n.id, n]))

/** Colours that read well as everyday clothes (fewer neons on adults, all fine for kids). */
const CLOTHES: readonly PaletteColor[] = PALETTE_COLORS
const HAIR_COLORS: readonly PaletteColor[] = ['carbo', 'xocolata', 'xocolata', 'mango', 'neu', 'coral', 'carbo']

/** A random but stable townsperson for crowds. Same seed, same person (and same height). */
export function neighbourFromSeed(seed: string | number): { spec: AvatarSpec; stature: number } {
  const r = rng(`veí-${seed}`)
  const top = pick(r, TOPS)
  const bottom = pick(r, BOTTOMS)
  const hasAccessory = r() < 0.45
  const spec: AvatarSpec = {
    skin: pick(r, SKIN_TONES),
    hair: { style: pick(r, HAIR).id, color: pick(r, HAIR_COLORS) },
    eyes: pick(r, EYES).id,
    mouth: pick(r, MOUTHS).id,
    top: w(top.id, pick(r, CLOTHES)),
    bottom: w(bottom.id, pick(r, CLOTHES)),
    shoes: w(pick(r, SHOES).id, pick(r, CLOTHES)),
    accessory: hasAccessory ? w(pick(r, ACCESSORIES).id, pick(r, CLOTHES)) : null,
  }
  const adult = r() < 0.6
  return { spec, stature: adult ? Math.round(between(r, 1.08, 1.24) * 100) / 100 : Math.round(between(r, 0.94, 1.02) * 100) / 100 }
}
