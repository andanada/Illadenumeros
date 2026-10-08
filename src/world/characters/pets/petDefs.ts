import type { CharacterId } from '../../../core/storage/db'
import type { CatalogEntry } from '../../model/types'

/**
 * The five old mascots, now adoptable town pets. Same personalities (src/ui/mascot/characters.ts),
 * redrawn in the flat no-outline style. Colours are part of their identity, so pets are not recolourable.
 */
export type PetId = CharacterId
export type PetPose = 'idle' | 'happy' | 'sleep'
export type PetEars = 'bunny-long' | 'cat' | 'dog-flop' | 'cloud' | 'bunny-pink'

export interface PetDef {
  id: PetId
  name: string
  description: string
  ears: PetEars
  fur: string
  furShade: string
  belly: string
  inner: string
  accent: string
  nose: string
  /** Eye ink; dark-furred pets get light eyes so they still read. */
  eye?: string
  tail: 'pompom' | 'cat' | 'wag' | 'cloud'
}

export const PETS: Readonly<Record<PetId, PetDef>> = {
  nyx: {
    id: 'nyx',
    name: 'Nyx',
    description: 'Conilleta punk, porta una estrella fosforita',
    ears: 'bunny-long',
    fur: '#3B3156',
    furShade: '#28213D',
    belly: '#57497A',
    inner: '#E05CF0',
    accent: '#E05CF0',
    nose: '#FF8DBA',
    eye: '#FFF4FE',
    tail: 'pompom',
  },
  mixa: {
    id: 'mixa',
    name: 'Mixa',
    description: 'Gateta blanca molt presumida, amb llaç lila',
    ears: 'cat',
    fur: '#FBF6EC',
    furShade: '#E7DCEB',
    belly: '#FFFFFF',
    inner: '#FFC3DA',
    accent: '#9A7BE6',
    nose: '#FF8DBA',
    tail: 'cat',
  },
  blau: {
    id: 'blau',
    name: 'Blau',
    description: 'Gosset blau entremaliat, sempre amb ganes de jugar',
    ears: 'dog-flop',
    fur: '#5FA9EE',
    furShade: '#3B82CF',
    belly: '#FDE7C7',
    inner: '#3B82CF',
    accent: '#FFB834',
    nose: '#2B2440',
    tail: 'wag',
  },
  nuvol: {
    id: 'nuvol',
    name: 'Núvol',
    description: 'Cadellet esponjós com un núvol',
    ears: 'cloud',
    fur: '#FFFFFF',
    furShade: '#D6E9FA',
    belly: '#F2F8FF',
    inner: '#BFE0FB',
    accent: '#4DA6EC',
    nose: '#2E5C8A',
    tail: 'cloud',
  },
  melo: {
    id: 'melo',
    name: 'Melo',
    description: 'Conilleta rosa dolça amb una floreta',
    ears: 'bunny-pink',
    fur: '#FF9FC6',
    furShade: '#E8709F',
    belly: '#FFE1EE',
    inner: '#FFE1EE',
    accent: '#FFD23F',
    nose: '#C2457A',
    tail: 'pompom',
  },
}

export const PET_IDS = Object.keys(PETS) as PetId[]

/** Shop entries for adopting pets. */
export const PET_CATALOG: readonly CatalogEntry[] = PET_IDS.map((id, i) => ({
  id,
  kind: 'pet',
  name: PETS[id].name,
  price: 40 + i * 5,
}))
