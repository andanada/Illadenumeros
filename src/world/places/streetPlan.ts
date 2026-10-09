import type { SceneId } from '../model/types'
import type { PlaceModule } from './types'

/** The street, left to right. Places not built yet still stand there, behind scaffolding. */
export const STREET_ORDER: readonly SceneId[] = ['casa', 'botiga', 'autobus', 'perruqueria', 'recreatius', 'fleca', 'granja', 'pizzeria', 'mercat']

/** Names of every lot (used for places that are not built yet; built ones use their own title). */
const LOT_NAMES: Readonly<Record<SceneId, string>> = {
  casa: 'la Casa',
  botiga: 'la Botiga',
  autobus: 'l’Autobús',
  perruqueria: 'la Perruqueria',
  recreatius: 'els Recreatius',
  fleca: 'la Fleca',
  granja: 'la Granja',
  pizzeria: 'la Pizzeria',
  mercat: 'el Mercat',
}

export interface StreetEntry {
  readonly id: SceneId
  /** Lower-case article form, for sentences: «Entra a la Botiga». */
  readonly name: string
  /** Undefined = not built yet («Obrim aviat!» for everybody). */
  readonly place: PlaceModule | undefined
}

/** «La Botiga» → «la Botiga», «L’Autobús» → «l’Autobús»; names without an article stay as they are. */
export function sentenceName(title: string): string {
  const m = /^(La|El|Els|Les|L’|L')(\s?)(.*)$/.exec(title.trim())
  if (!m) return title.trim()
  const article = m[1] === "L'" ? 'l’' : (m[1] ?? '').toLowerCase()
  return `${article}${m[2] ?? ''}${m[3] ?? ''}`
}

/** «la Botiga» → «La Botiga» (start of a sentence). */
export const capitalised = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1)

/** Every lot of the street in order, with its module when the place exists. Unknown extra places go at the end. */
export function streetEntries(places: readonly PlaceModule[]): StreetEntry[] {
  const byId = new Map(places.map((p) => [p.id, p]))
  const extra = places.filter((p) => !STREET_ORDER.includes(p.id)).map((p) => p.id)
  return [...STREET_ORDER, ...extra].map((id) => {
    const place = byId.get(id)
    return { id, name: place ? sentenceName(place.title) : LOT_NAMES[id], place }
  })
}
