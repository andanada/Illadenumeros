import { place as autobus } from './autobus'
import { place as botiga } from './botiga'
import { place as casa } from './casa'
import { place as perruqueria } from './perruqueria'
import { place as recreatius } from './recreatius'
import type { PlaceModule } from './types'

/**
 * Every place plugged into the town (each folder's index.ts exports its `place`). The street order and
 * the lots still under construction live in streetPlan.ts; when a place opens is decided by unlock.ts.
 * Only the modules' metadata is loaded here: each place's scene is a lazy chunk.
 */
export const PLACES: readonly PlaceModule[] = [casa, botiga, autobus, perruqueria, recreatius]
