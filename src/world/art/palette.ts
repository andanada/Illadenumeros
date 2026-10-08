import { PALETTE_COLORS, SKIN_TONES, type AvatarSpec, type PaletteColor } from '../model/types'

/**
 * Colour tokens of the town. Every recolourable thing receives a PaletteColor and paints itself with
 * the three steps of its swatch: `base` (flat fill), `light` (highlights, inner shapes) and `shade`
 * (the flat "turned away" side, folds, cast shapes). No outlines anywhere: shapes are separated by value.
 */
export interface Swatch {
  base: string
  light: string
  shade: string
}

export type SkinTone = AvatarSpec['skin']

export const PALETTE: Readonly<Record<PaletteColor, Swatch>> = {
  coral: { base: '#FF6B5B', light: '#FFA195', shade: '#D9473B' },
  mango: { base: '#FFB834', light: '#FFD77E', shade: '#E8901A' },
  llima: { base: '#A8D143', light: '#CDE68A', shade: '#7FA92B' },
  menta: { base: '#36C5A2', light: '#8FE3CC', shade: '#209A7E' },
  cel: { base: '#4DA6EC', light: '#9CCFF7', shade: '#2E7FC4' },
  lila: { base: '#9A7BE6', light: '#C8B6F4', shade: '#7154C2' },
  rosa: { base: '#FF8DBA', light: '#FFC3DA', shade: '#E2639A' },
  xocolata: { base: '#8A5638', light: '#B4805C', shade: '#643A22' },
  neu: { base: '#FBF6EC', light: '#FFFFFF', shade: '#E4D9C6' },
  carbo: { base: '#34304A', light: '#57516F', shade: '#221F33' },
}

export const SKIN: Readonly<Record<SkinTone, Swatch>> = {
  s1: { base: '#FFE3CC', light: '#FFF1E5', shade: '#F2C6A6' },
  s2: { base: '#F7C9A2', light: '#FCDEC4', shade: '#E6A97E' },
  s3: { base: '#E2A574', light: '#EEC098', shade: '#C9864F' },
  s4: { base: '#C0835A', light: '#D29F7A', shade: '#A0663F' },
  s5: { base: '#8F5B3E', light: '#AA7556', shade: '#71432A' },
  s6: { base: '#5F3B2A', light: '#7A503C', shade: '#472A1D' },
}

/** Fixed, non-recolourable inks shared by every drawing. */
export const INK = {
  /** Eyes, mouths, tiny details: never pure black. */
  face: '#2B2440',
  blush: '#FF7E93',
  mouthInside: '#9C2B4A',
  tongue: '#FF8FA0',
  teeth: '#FFFFFF',
  shadow: '#2B2440',
  white: '#FFFFFF',
} as const

export const PALETTE_ORDER: readonly PaletteColor[] = PALETTE_COLORS
export const SKIN_ORDER: readonly SkinTone[] = SKIN_TONES

/** Catalan names for swatches (accessible names in the creator). */
export const COLOR_NAMES: Readonly<Record<PaletteColor, string>> = {
  coral: 'Corall',
  mango: 'Mango',
  llima: 'Llima',
  menta: 'Menta',
  cel: 'Cel',
  lila: 'Lila',
  rosa: 'Rosa',
  xocolata: 'Xocolata',
  neu: 'Neu',
  carbo: 'Carbó',
}

export const SKIN_NAMES: Readonly<Record<SkinTone, string>> = {
  s1: 'Pell molt clara',
  s2: 'Pell clara',
  s3: 'Pell mitjana',
  s4: 'Pell bruna',
  s5: 'Pell fosca',
  s6: 'Pell molt fosca',
}

export const swatch = (color: PaletteColor): Swatch => PALETTE[color]
export const skin = (tone: SkinTone): Swatch => SKIN[tone]

/**
 * A readable contrast colour drawn on top of `color` (stripes, prints, buttons).
 * Light garments get a coloured print, dark/saturated garments get cream.
 */
export function printOn(color: PaletteColor): string {
  if (color === 'neu') return PALETTE.coral.base
  if (color === 'mango' || color === 'llima') return PALETTE.neu.light
  return PALETTE.neu.base
}
