import type { Rng } from '../../../core/rng'

/** Small Catalan grammar helpers for word problems (agreement, plurals, elision). */

export interface Noun {
  singular: string
  plural: string
  feminine: boolean
}

export const CHARACTERS = ['Nyx', 'Mixa', 'Blau', 'Núvol', 'Melo'] as const

export const THINGS: readonly Noun[] = [
  { singular: 'magdalena', plural: 'magdalenes', feminine: true },
  { singular: 'llaminadura', plural: 'llaminadures', feminine: true },
  { singular: 'adhesiu', plural: 'adhesius', feminine: false },
  { singular: 'galeta', plural: 'galetes', feminine: true },
  { singular: 'caramel', plural: 'caramels', feminine: false },
  { singular: 'cromo', plural: 'cromos', feminine: false },
  { singular: 'poma', plural: 'pomes', feminine: true },
]

export const CONTAINERS: readonly Noun[] = [
  { singular: 'caixa', plural: 'caixes', feminine: true },
  { singular: 'bossa', plural: 'bosses', feminine: true },
  { singular: 'plat', plural: 'plats', feminine: false },
  { singular: 'safata', plural: 'safates', feminine: true },
]

const STARTS_WITH_VOWEL = /^[aeiouàèéíòóúh]/i

/** "3 magdalenes", "una magdalena", "un adhesiu". */
export function countOf(n: number, noun: Noun): string {
  if (n === 1) return `${noun.feminine ? 'una' : 'un'} ${noun.singular}`
  return `${n} ${noun.plural}`
}

/** "Quantes magdalenes" / "Quants adhesius". */
export const howMany = (noun: Noun): string => `${noun.feminine ? 'Quantes' : 'Quants'} ${noun.plural}`

/** "de galetes" / "d’adhesius". */
export const de = (word: string): string => (STARTS_WITH_VOWEL.test(word) ? `d’${word}` : `de ${word}`)

/** "de 4" / "d’1" / "d’11": numbers read with an initial vowel elide "de". */
export const deNumber = (n: number): string => (n === 1 || n === 11 ? `d’${n}` : `de ${n}`)

/** "cada una" / "cada un" agreeing with the noun. */
export const eachOne = (noun: Noun): string => (noun.feminine ? 'cada una' : 'cada un')

/** `count` different items, in random order. */
export function pickDistinct<T>(rng: Rng, items: readonly T[], count: number): T[] {
  return rng.shuffle(items).slice(0, count)
}
