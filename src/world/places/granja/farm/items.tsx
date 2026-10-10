import type { InteractableDef } from '../../../sandbox/defs'
import type { UseChain } from '../../../sandbox/logic/useChain'
import { EggArt, FertiliserArt, GrainArt, HenArt, NestArt, PlantArt, SackArt, SeedArt, WateringCanArt } from './itemArt'
import { PALETTE as P } from '../../../art/palette'

/** Growing: sow → water → sprout (water again) → ripe (fertiliser). Each tool brings the plant to the next stage. */
export const GROWING: UseChain = {
  stages: [
    { id: 'llavor', label: 'una llavor', said: 'Una llavor a la terra.' },
    { id: 'regada', label: 'regada', tool: 'regadora', said: 'Regada! La terra beu.' },
    { id: 'brot', label: 'un brot', tool: 'regadora', said: 'Ha sortit un brot!' },
    { id: 'madura', label: 'madura', tool: 'adob', said: 'Quina pastanaga més gran!' },
  ],
}

export const FARM_DEFS: readonly InteractableDef[] = [
  { id: 'planta', label: 'la llavor', single: 'una llavor', height: 0.1, pickup: true, use: GROWING, art: (s) => <PlantArt stage={s.stage} /> },
  { id: 'llavor-peticio', label: 'la llavor', single: 'una llavor', height: 0.075, pickup: true, art: () => <SeedArt /> },
  { id: 'gra', label: 'el cub de gra', single: 'un cub de gra', height: 0.075, pickup: true, art: () => <GrainArt /> },
  { id: 'ou-peticio', label: 'l’ou', single: 'un ou', height: 0.075, pickup: true, art: () => <EggArt /> },
  { id: 'ou', label: 'l’ou', single: 'un ou', height: 0.08, pickup: true, toss: true, art: () => <EggArt /> },
  { id: 'regadora', label: 'la regadora', height: 0.11, pickup: true, tool: 'regadora', art: () => <WateringCanArt /> },
  { id: 'adob', label: 'el sac d’adob', height: 0.11, pickup: true, tool: 'adob', art: () => <FertiliserArt /> },
  { id: 'gallina', label: 'la gallina', height: 0.13, pickup: true, toss: true, art: () => <HenArt /> },
  { id: 'sac-llavors', label: 'el sac de llavors', aspect: 1, height: 0.17, container: true, art: (s) => <SackArt open={s.open} tint={P.mango.base} /> },
  { id: 'sac-gra', label: 'el sac de gra', aspect: 1, height: 0.17, container: true, art: (s) => <SackArt open={s.open} tint={P.mango.light} /> },
  { id: 'niu', label: 'el niu', aspect: 1.1, height: 0.1, container: true, art: (s) => <NestArt open={s.open} /> },
]
