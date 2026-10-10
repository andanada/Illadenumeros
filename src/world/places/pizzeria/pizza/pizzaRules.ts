import type { TransformRule } from '../../shared/doing/zoneTransform'

export const OVEN = 'forn-pizza'

/** Raw pizza in the oven comes out baked; no timer, and a half-made one bakes too (it is free play). */
export const PIZZA_RULES: readonly TransformRule[] = [{ zone: OVEN, from: 'massa-pizza', to: 'pizza-cuita', said: 'Al forn! La pizza surt cuita i fumejant.' }]
