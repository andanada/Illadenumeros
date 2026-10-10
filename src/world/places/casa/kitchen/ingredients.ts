/** Countable ingredients of the home kitchen (drawn in ./IngredientArt). */
export interface Ingredient {
  id: 'maduixa' | 'nabiu' | 'galeta' | 'ou' | 'tovallola' | 'croqueta'
  one: string
  many: string
  gender: 'f' | 'm'
  /** What the family is cooking with it. */
  dish: string
}

export const INGREDIENTS: readonly Ingredient[] = [
  { id: 'maduixa', one: 'maduixa', many: 'maduixes', gender: 'f', dish: 'el batut' },
  { id: 'nabiu', one: 'nabiu', many: 'nabius', gender: 'm', dish: 'les creps' },
  { id: 'galeta', one: 'galeta', many: 'galetes', gender: 'f', dish: 'el pastís' },
  { id: 'ou', one: 'ou', many: 'ous', gender: 'm', dish: 'la truita' },
]

const hash = (text: string): number => [...text].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381)

/** Stable ingredient for an item id: the same question always cooks the same thing. */
export const ingredientFor = (seed: string): Ingredient => INGREDIENTS[hash(seed) % INGREDIENTS.length] ?? (INGREDIENTS[0] as Ingredient)

/** "la maduixa", "el nabiu", "l’ou". */
export const withArticle = (i: Ingredient): string => (/^[aeiouàèéíòóú]/i.test(i.one) ? `l’${i.one}` : `${i.gender === 'f' ? 'la' : 'el'} ${i.one}`)

/** What each family member asks for (the same bowl, another thing to count): strawberries for the grandma, towels for the bath, kibble for the pet. */
export const THEME_INGREDIENTS = {
  maduixa: { id: 'maduixa', one: 'maduixa', many: 'maduixes', gender: 'f', dish: 'el batut' },
  galeta: { id: 'galeta', one: 'galeta', many: 'galetes', gender: 'f', dish: 'el pastís' },
  tovallola: { id: 'tovallola', one: 'tovallola', many: 'tovalloles', gender: 'f', dish: 'l’hora del bany' },
  croqueta: { id: 'croqueta', one: 'croqueta', many: 'croquetes', gender: 'f', dish: 'el pinso de la mascota' },
} as const satisfies Readonly<Record<string, Ingredient>>

export type ThemeId = keyof typeof THEME_INGREDIENTS
