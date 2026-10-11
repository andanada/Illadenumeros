import type { InteractableDef } from '../../../sandbox/defs'
import { IngredientArt } from '../kitchen/IngredientArt'
import { INGREDIENTS, THEME_INGREDIENTS, type Ingredient } from '../kitchen/ingredients'
import { looseDef, preDef } from './homeTask'

const ALL: readonly Ingredient[] = [...new Map([...INGREDIENTS, ...Object.values(THEME_INGREDIENTS)].map((i) => [i.id, i])).values()]

const art = (id: Ingredient['id']) => () => (
  <g transform="scale(2.4) translate(2 0)">
    <IngredientArt id={id} size={40} />
  </g>
)

const one = (i: Ingredient): string => `${i.gender === 'f' ? 'una' : 'un'} ${i.one}`
const article = (i: Ingredient): string => (/^[aeiou]/.test(i.one) ? 'l’' : i.gender === 'f' ? 'la ' : 'el ')

/**
 * What the family asks you to carry: one def for the things she carries (picked up from the pile, a big touch
 * target) and one for the things that were already there («ja n’hi ha 6»), which cannot be picked up again.
 */
export const HOME_TASK_DEFS: readonly InteractableDef[] = ALL.flatMap((i) => [
  { id: looseDef(i), label: `${article(i)}${i.one}`, single: one(i), height: 0.15, pickup: true, minHit: 64, art: art(i.id) },
  { id: preDef(i), label: `${article(i)}${i.one} que ja hi era`, single: one(i), height: 0.15, art: art(i.id) },
])
