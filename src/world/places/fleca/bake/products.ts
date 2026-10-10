import type { TransformRule } from '../../shared/doing/zoneTransform'

export interface Product {
  readonly id: 'magdalena' | 'croissant' | 'baguette'
  /** Singular / plural with article-less nouns, for requests: «3 caixes de 6 magdalenes». */
  readonly one: string
  readonly many: string
  readonly gender: 'f' | 'm'
  /** Raw dough def, baked-hot def, and the cool, finished def. */
  readonly raw: string
  readonly hot: string
  readonly height: number
}

export const PRODUCTS: readonly Product[] = [
  { id: 'magdalena', one: 'magdalena', many: 'magdalenes', gender: 'f', raw: 'pasta-magdalena', hot: 'magdalena-calenta', height: 0.085 },
  { id: 'croissant', one: 'croissant', many: 'croissants', gender: 'm', raw: 'pasta-croissant', hot: 'croissant-calent', height: 0.08 },
  { id: 'baguette', one: 'baguet', many: 'baguets', gender: 'f', raw: 'pasta-baguette', hot: 'baguette-calenta', height: 0.07 },
]

export const productById = (id: string): Product | undefined => PRODUCTS.find((p) => p.id === id)

/** The product a customer's item is about, chosen from the request id so it is stable. */
export function productFor(key: string): Product {
  const h = [...key].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7)
  return PRODUCTS[h % PRODUCTS.length] ?? PRODUCTS[0]!
}

export const OVEN = 'forn'
export const RACK = 'reixa'

/** Shape → tray → oven → cool → box: no timers; each place a thing lands changes it. */
export const BAKE_RULES: readonly TransformRule[] = PRODUCTS.flatMap((p) => [
  { zone: OVEN, from: p.raw, to: p.hot, said: `Al forn! ${p.gender === 'f' ? 'La' : 'El'} ${p.one} ja és ${p.gender === 'f' ? 'cuita' : 'cuit'}, però crema!` },
  { zone: RACK, from: p.hot, to: p.id, said: `Ara es refreda: ${p.gender === 'f' ? 'la' : 'el'} ${p.one} ja es pot posar a la caixa.` },
])
