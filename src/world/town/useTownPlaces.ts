import { useMemo } from 'react'
import { useProgress } from '../../core/progress/store'
import type { SceneId } from '../model/types'
import { streetEntries, type StreetEntry } from '../places/streetPlan'
import type { PlaceModule } from '../places/types'
import { isPlaceOpen } from '../places/unlock'

export interface TownLot extends StreetEntry {
  readonly open: boolean
}

export interface TownPlaces {
  /** Every lot of the street, in order. */
  readonly lots: readonly TownLot[]
  /** Built places the child can enter now (stable identity while her progress does not change them). */
  readonly open: readonly PlaceModule[]
  readonly byId: (id: SceneId) => TownLot | undefined
}

/** The street for the active child: which places are built and which are open for her. */
export function useTownPlaces(places: readonly PlaceModule[]): TownPlaces {
  const skillStates = useProgress((s) => s.skillStates)
  const lots = useMemo(() => streetEntries(places).map((e) => ({ ...e, open: e.place !== undefined && isPlaceOpen(e.place, { skillStates }) })), [places, skillStates])
  const openKey = lots
    .filter((l) => l.open)
    .map((l) => l.id)
    .join(',')
  // Only a change in WHICH places are open gives a new list (the board is built from it).
  const open = useMemo(
    () => openKey.split(',').flatMap((id) => places.filter((p) => p.id === id)),
    [openKey, places],
  )
  return useMemo(() => ({ lots, open, byId: (id: SceneId) => lots.find((l) => l.id === id) }), [lots, open])
}
