import { PALETTE_COLORS, SKIN_TONES, type AvatarSpec, type PaletteColor } from '../../model/types'
import { pick, rng } from '../../art/random'
import { ACCESSORIES } from '../kit/accessories'
import { BOTTOMS } from '../kit/bottoms'
import { EYES, MOUTHS } from '../kit/face'
import { HAIR } from '../kit/hair'
import { SHOES } from '../kit/shoes'
import { TOPS } from '../kit/tops'

/** Pure state of the avatar creator. The component only renders it and dispatches actions. */
export const CREATOR_TABS = ['pell', 'cabell', 'cara', 'dalt', 'baix', 'sabates', 'complements'] as const
export type CreatorTab = (typeof CREATOR_TABS)[number]
export type WornSlot = 'top' | 'bottom' | 'shoes'
export type ColorSlot = WornSlot | 'hair' | 'accessory'

/** Which ids the child may pick (e.g. only owned clothes). Defaults to everything. */
export interface CreatorOptions {
  hair: readonly string[]
  eyes: readonly string[]
  mouth: readonly string[]
  top: readonly string[]
  bottom: readonly string[]
  shoes: readonly string[]
  accessory: readonly string[]
}

export const ALL_OPTIONS: CreatorOptions = {
  hair: HAIR.map((p) => p.id),
  eyes: EYES.map((p) => p.id),
  mouth: MOUTHS.map((p) => p.id),
  top: TOPS.map((p) => p.id),
  bottom: BOTTOMS.map((p) => p.id),
  shoes: SHOES.map((p) => p.id),
  accessory: ACCESSORIES.map((p) => p.id),
}

/** Restrict the options to owned ids; whatever the avatar already wears always stays available. */
export function optionsFor(owned: readonly string[] | undefined, spec: AvatarSpec): CreatorOptions {
  if (!owned) return ALL_OPTIONS
  const set = new Set([...owned, spec.hair.style, spec.top.item, spec.bottom.item, spec.shoes.item, ...(spec.accessory ? [spec.accessory.item] : [])])
  const keep = (ids: readonly string[]) => ids.filter((id) => set.has(id))
  return { ...ALL_OPTIONS, hair: keep(ALL_OPTIONS.hair), top: keep(ALL_OPTIONS.top), bottom: keep(ALL_OPTIONS.bottom), shoes: keep(ALL_OPTIONS.shoes), accessory: keep(ALL_OPTIONS.accessory) }
}

export interface CreatorState {
  spec: AvatarSpec
  tab: CreatorTab
  /** Colour the accessory gets when the child switches one on again. */
  accessoryColor: PaletteColor
  /** Increments on every randomise (drives the celebration animation). */
  spins: number
  options: CreatorOptions
}

export type CreatorAction =
  | { type: 'tab'; tab: CreatorTab }
  | { type: 'skin'; skin: AvatarSpec['skin'] }
  | { type: 'hair'; style: string }
  | { type: 'eyes'; id: string }
  | { type: 'mouth'; id: string }
  | { type: 'wear'; slot: WornSlot; item: string }
  | { type: 'accessory'; item: string | null }
  | { type: 'color'; slot: ColorSlot; color: PaletteColor }
  | { type: 'randomise'; seed: string | number }
  | { type: 'reset'; spec: AvatarSpec }

export function initCreator(spec: AvatarSpec, options: CreatorOptions = ALL_OPTIONS): CreatorState {
  return { spec, tab: 'pell', accessoryColor: spec.accessory?.color ?? 'rosa', spins: 0, options }
}

const withSpec = (state: CreatorState, spec: AvatarSpec): CreatorState => ({ ...state, spec })

function setColor(state: CreatorState, slot: ColorSlot, color: PaletteColor): CreatorState {
  const { spec } = state
  switch (slot) {
    case 'hair':
      return withSpec(state, { ...spec, hair: { ...spec.hair, color } })
    case 'accessory':
      return spec.accessory
        ? { ...withSpec(state, { ...spec, accessory: { ...spec.accessory, color } }), accessoryColor: color }
        : { ...state, accessoryColor: color }
    default:
      return withSpec(state, { ...spec, [slot]: { ...spec[slot], color } })
  }
}

const NATURAL_HAIR: readonly PaletteColor[] = ['carbo', 'xocolata', 'mango', 'neu', 'coral']

/** A cheerful random outfit: top and bottom never share a colour, hair is mostly natural. */
export function randomSpec(seed: string | number, options: CreatorOptions, base: AvatarSpec): AvatarSpec {
  const r = rng(`creador-${seed}`)
  const or = <T,>(list: readonly T[], fallback: T): T => (list.length ? pick(r, list) : fallback)
  const topColor = pick(r, PALETTE_COLORS)
  const bottomColor = pick(r, PALETTE_COLORS.filter((c) => c !== topColor))
  const accessory = options.accessory.length && r() < 0.6 ? { item: pick(r, options.accessory), color: pick(r, PALETTE_COLORS) } : null
  return {
    skin: base.skin,
    hair: { style: or(options.hair, base.hair.style), color: r() < 0.8 ? pick(r, NATURAL_HAIR) : pick(r, PALETTE_COLORS) },
    eyes: or(options.eyes, base.eyes),
    mouth: or(options.mouth, base.mouth),
    top: { item: or(options.top, base.top.item), color: topColor },
    bottom: { item: or(options.bottom, base.bottom.item), color: bottomColor },
    shoes: { item: or(options.shoes, base.shoes.item), color: pick(r, PALETTE_COLORS) },
    accessory,
  }
}

export function creatorReducer(state: CreatorState, action: CreatorAction): CreatorState {
  const { spec, options } = state
  switch (action.type) {
    case 'tab':
      return { ...state, tab: action.tab }
    case 'skin':
      return SKIN_TONES.includes(action.skin) ? withSpec(state, { ...spec, skin: action.skin }) : state
    case 'hair':
      return options.hair.includes(action.style) ? withSpec(state, { ...spec, hair: { ...spec.hair, style: action.style } }) : state
    case 'eyes':
      return options.eyes.includes(action.id) ? withSpec(state, { ...spec, eyes: action.id }) : state
    case 'mouth':
      return options.mouth.includes(action.id) ? withSpec(state, { ...spec, mouth: action.id }) : state
    case 'wear':
      return options[action.slot].includes(action.item) ? withSpec(state, { ...spec, [action.slot]: { ...spec[action.slot], item: action.item } }) : state
    case 'accessory':
      if (action.item === null) return withSpec(state, { ...spec, accessory: null })
      return options.accessory.includes(action.item) ? withSpec(state, { ...spec, accessory: { item: action.item, color: spec.accessory?.color ?? state.accessoryColor } }) : state
    case 'color':
      return PALETTE_COLORS.includes(action.color) ? setColor(state, action.slot, action.color) : state
    case 'randomise': {
      const next = randomSpec(action.seed, options, spec)
      return { ...state, spec: next, spins: state.spins + 1, accessoryColor: next.accessory?.color ?? state.accessoryColor }
    }
    case 'reset':
      return { ...state, spec: action.spec, accessoryColor: action.spec.accessory?.color ?? state.accessoryColor }
  }
}
