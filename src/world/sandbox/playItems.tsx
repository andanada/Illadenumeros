import type { InteractableDef } from './defs'
import { AppleArt, BallArt, KnifeArt, PlateArt, PotArt, SpongeArt } from './art/foodArt'
import { EggArt, FridgeArt } from './art/boxArt'
import type { UseChain } from './logic/useChain'

/** Cooking: wash → chop → cook → plate. Each tool brings the apple into the next stage. */
export const COOKING: UseChain = {
  stages: [
    { id: 'crua', label: 'crua', said: 'Una poma crua i una mica bruta.' },
    { id: 'neta', label: 'neta', tool: 'esponja', said: 'Neta i lluenta!' },
    { id: 'tallada', label: 'tallada', tool: 'ganivet', said: 'A trossets!' },
    { id: 'cuita', label: 'cuita', tool: 'olla', said: 'Cuita, quin tuf més bo!' },
    { id: 'emplatada', label: 'emplatada', tool: 'plat', said: 'Emplatada! Bon profit!' },
  ],
}

/** The objects of the demo room: one of each kind of behaviour. */
export const PLAY_DEFS: readonly InteractableDef[] = [
  { id: 'nevera', label: 'la nevera', aspect: 0.6, height: 0.5, container: true, art: (s) => <FridgeArt open={s.open} /> },
  { id: 'poma', label: 'la poma', height: 0.13, pickup: true, use: COOKING, art: (s) => <AppleArt stage={s.stage} /> },
  { id: 'esponja', label: 'l’esponja', height: 0.1, pickup: true, tool: 'esponja', art: () => <SpongeArt /> },
  { id: 'ganivet', label: 'el ganivet', height: 0.13, pickup: true, tool: 'ganivet', art: () => <KnifeArt /> },
  { id: 'olla', label: 'l’olla', height: 0.12, pickup: true, tool: 'olla', art: () => <PotArt /> },
  { id: 'plat', label: 'el plat', height: 0.09, pickup: true, tool: 'plat', art: () => <PlateArt /> },
  { id: 'pilota', label: 'la pilota', height: 0.12, pickup: true, toss: true, art: () => <BallArt /> },
  { id: 'pometa', label: 'la poma', single: 'una poma', height: 0.075, pickup: true, art: () => <AppleArt stage="crua" /> },
  {
    id: 'moneda',
    label: 'la moneda',
    single: 'una moneda',
    height: 0.07,
    pickup: true,
    stackable: true,
    quantityBadge: true,
    art: () => (
      <g>
        <ellipse cx="50" cy="94" rx="30" ry="6" fill="rgba(0,0,0,0.18)" />
        <circle cx="50" cy="60" r="32" fill="#ffb834" stroke="#fff" strokeWidth="6" />
        <circle cx="50" cy="60" r="20" fill="none" stroke="#fff3c4" strokeWidth="5" />
      </g>
    ),
  },
  {
    id: 'ou',
    label: 'l’ou sorpresa',
    height: 0.15,
    surprise: true,
    surpriseTaps: 3,
    surpriseOptions: ['un pollet', 'una estrella', 'un cor'],
    art: (s) => <EggArt charge={s.charge} revealed={s.revealed} />,
  },
]
