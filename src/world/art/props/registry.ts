import { FIXTURES } from './shop/fixtures'
import { FOOD } from './shop/food'
import { MONEDA_POBLE, MONEY } from './shop/money'
import { TOYS } from './shop/toys'
import { FACADES } from './street/facades'
import { NATURE } from './street/nature'
import { SKY } from './street/sky'
import type { PropDef } from './types'

/** Every prop of Phase 1, by stable id. */
export const PROPS: readonly PropDef[] = [...FIXTURES, ...FOOD, ...TOYS, ...MONEY, MONEDA_POBLE, ...FACADES, ...NATURE, ...SKY]

export const PROPS_BY_ID: Readonly<Record<string, PropDef>> = Object.fromEntries(PROPS.map((p) => [p.id, p]))
