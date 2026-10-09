export interface Product {
  /** Prop id in the art library (src/world/art/props). */
  id: string
  one: string
  many: string
  /** Grammatical gender: picks "Posa-les" / "Posa'ls", "la" / "el". */
  gender: 'f' | 'm'
  /** Price in cents for the free-play till. */
  price: number
}

export const PRODUCTS: readonly Product[] = [
  { id: 'poma', one: 'poma', many: 'pomes', gender: 'f', price: 50 },
  { id: 'platan', one: 'plàtan', many: 'plàtans', gender: 'm', price: 40 },
  { id: 'taronja', one: 'taronja', many: 'taronges', gender: 'f', price: 60 },
  { id: 'barra-pa', one: 'barra de pa', many: 'barres de pa', gender: 'f', price: 120 },
  { id: 'croissant', one: 'croissant', many: 'croissants', gender: 'm', price: 90 },
  { id: 'llet', one: 'brick de llet', many: 'bricks de llet', gender: 'm', price: 100 },
]

/** Products that fit in a basket errand (countable, with a nice plural). */
export const BASKET_PRODUCTS: readonly Product[] = PRODUCTS.filter((p) => ['poma', 'platan', 'taronja', 'croissant'].includes(p.id))

export const productById = (id: string): Product | undefined => PRODUCTS.find((p) => p.id === id)

/** "la poma", "el plàtan", "l’…" is not needed for these words. */
export const withArticle = (p: Product): string => `${p.gender === 'f' ? 'la' : 'el'} ${p.one}`

const hash = (text: string): number => [...text].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381)

/** Stable product for an item: the same question always asks for the same thing. */
export const productFor = (seed: string, pool: readonly Product[] = BASKET_PRODUCTS): Product => pool[hash(seed) % pool.length] ?? (pool[0] as Product)

/** "la poma" for a product id (the id itself if unknown). */
export const labelOf = (id: string): string => {
  const p = productById(id)
  return p ? withArticle(p) : id
}
