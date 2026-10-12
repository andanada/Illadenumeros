import { THEME_INGREDIENTS } from '../../src/world/places/casa/kitchen/ingredients'
import type { ThemeId } from '../../src/world/places/casa/kitchen/ingredients'
import { CASA_ADAPTERS, themedAdapters } from '../../src/world/places/casa/kitchen/casaAdapters'
import { AUTOBUS_ADAPTERS } from '../../src/world/places/autobus/errands/autobusAdapters'
import { BOTIGA_ADAPTERS } from '../../src/world/places/botiga/errands/botigaAdapters'
import { FLECA_ADAPTERS } from '../../src/world/places/fleca/tasks/flecaAdapters'
import { GRANJA_ADAPTERS } from '../../src/world/places/granja/errands/granjaAdapters'
import { MERCAT_ADAPTERS } from '../../src/world/places/mercat/errands/mercatAdapters'
import { PERRUQUERIA_ADAPTERS } from '../../src/world/places/perruqueria/errands/perruqueriaAdapters'
import { PIZZERIA_ADAPTERS } from '../../src/world/places/pizzeria/tasks/pizzeriaAdapters'
import { RECREATIUS_ADAPTERS } from '../../src/world/places/recreatius/prizes/prizeMode'
import { PLACES } from '../../src/world/places/registry'
import type { AnyErrandAdapter } from '../../src/world/errands/types'
import type { SceneId } from '../../src/world/model/types'

/**
 * Where each place of the town gets its neighbours' requests from: the same adapters its `useErrand` receives
 * at runtime, and the skills it serves (`PlaceModule.skills`). The casa also serves the family's themed requests
 * (towels, kibble, strawberries...), which are the same bowl task with other words.
 */
export interface TownPlaceSource {
  readonly id: SceneId
  readonly title: string
  readonly skills: readonly string[]
  /** One list per way the place can be asked in (a place asks with ONE list at a time). */
  readonly adapterSets: readonly (readonly AnyErrandAdapter[])[]
}

const ADAPTER_SETS: Readonly<Record<SceneId, readonly (readonly AnyErrandAdapter[])[]>> = {
  casa: [CASA_ADAPTERS, ...(Object.keys(THEME_INGREDIENTS) as ThemeId[]).map((theme) => themedAdapters(theme))],
  botiga: [BOTIGA_ADAPTERS],
  autobus: [AUTOBUS_ADAPTERS],
  perruqueria: [PERRUQUERIA_ADAPTERS],
  recreatius: [RECREATIUS_ADAPTERS],
  fleca: [FLECA_ADAPTERS],
  granja: [GRANJA_ADAPTERS],
  pizzeria: [PIZZERIA_ADAPTERS],
  mercat: [MERCAT_ADAPTERS],
}

export const TOWN_PLACES: readonly TownPlaceSource[] = PLACES.map((place) => ({
  id: place.id,
  title: place.title,
  skills: place.skills,
  adapterSets: ADAPTER_SETS[place.id],
}))
