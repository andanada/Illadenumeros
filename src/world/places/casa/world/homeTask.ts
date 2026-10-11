import type { Item } from '../../../../core/ambit/types'
import type { Ingredient, ThemeId } from '../kitchen/ingredients'
import { THEME_INGREDIENTS } from '../kitchen/ingredients'
import { bowlFromItem, type BowlMode } from '../kitchen/kitchenLogic'

/** A family request played with the hands: what to carry, how many are already there, how many she has to add. */
export interface HomeTask {
  readonly mode: BowlMode
  readonly ingredient: Ingredient
  /** Things already lying in the frame when the request starts («ja n’hi ha 6»). */
  readonly pre: number
  /** Things she has to carry in (and the answer). */
  readonly expected: number
  /** The frame holds this many when it is right. */
  readonly whole: number
  /** A ten-frame (10) or two (20): bridging ten needs the second one. */
  readonly capacity: 10 | 20
}

/** The world version of a kitchen item, or undefined when it does not fit (then the price tags in the card play it). */
export function homeTaskOf(item: Item, theme?: ThemeId): HomeTask | undefined {
  const bowl = bowlFromItem(item)
  if (!bowl) return undefined
  const ingredient = theme ? THEME_INGREDIENTS[theme] : bowl.ingredient
  const expected = bowl.mode === 'sum' ? bowl.a + bowl.b : bowl.b
  const whole = bowl.start + expected
  return { mode: bowl.mode, ingredient, pre: bowl.start, expected, whole, capacity: whole > 10 ? 20 : 10 }
}

/** The things of one request: the ones she carries and the ones that were already there. */
export const looseDef = (i: Pick<Ingredient, 'id'>): string => `casa-${i.id}`
export const preDef = (i: Pick<Ingredient, 'id'>): string => `casa-${i.id}-ja`

/** Where each kind of thing goes and where it comes from (Catalan, with article). */
export const PLACES: Readonly<Record<Ingredient['id'], { frame: string; source: string; icon: string }>> = {
  maduixa: { frame: 'el bol', source: 'la cistella de maduixes', icon: '🥣' },
  nabiu: { frame: 'el bol', source: 'la cistella de nabius', icon: '🥣' },
  galeta: { frame: 'la safata', source: 'el pot de galetes', icon: '🍪' },
  ou: { frame: 'el bol', source: 'la caixa d’ous', icon: '🥣' },
  tovallola: { frame: 'el penja-tovalloles', source: 'la cistella de tovalloles', icon: '🛁' },
  croqueta: { frame: 'el bol de la mascota', source: 'el sac de croquetes', icon: '🐾' },
}
