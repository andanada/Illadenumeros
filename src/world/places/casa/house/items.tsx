import type { ReactNode } from 'react'
import type { InteractableDef } from '../../../sandbox/defs'
import { EggArt, FridgeArt } from '../../../sandbox/art/boxArt'
import { AppleArt, BallArt, KnifeArt, PlateArt, PotArt, SpongeArt } from '../../../sandbox/art/foodArt'
import type { UseChain } from '../../../sandbox/logic/useChain'
import { BrushArt, BucketArt, DuckArt, PasteArt, SoapArt, ToothArt, TubArt } from './art/bathArt'
import { CanArt, GrowArt } from './art/gardenArt'

/** Cooking: wash, chop, cook, plate. */
export const COOKING: UseChain = {
  stages: [
    { id: 'crua', label: 'crua', said: 'Una poma crua i una mica bruta.' },
    { id: 'neta', label: 'neta', tool: 'esponja', said: 'Neta i lluenta!' },
    { id: 'tallada', label: 'tallada', tool: 'ganivet', said: 'A trossets!' },
    { id: 'cuita', label: 'cuita', tool: 'olla', said: 'Cuita, quin tuf més bo!' },
    { id: 'emplatada', label: 'emplatada', tool: 'plat', said: 'Emplatada! Bon profit!' },
  ],
}

/** The bath: fill it from the bucket, then the soap makes foam. */
export const BATH: UseChain = {
  stages: [
    { id: 'buida', label: 'buida', said: 'La banyera és buida.' },
    { id: 'plena', label: 'plena d’aigua', tool: 'galleda', said: 'Plof! La banyera s’omple d’aigua.' },
    { id: 'escuma', label: 'amb escuma', tool: 'sabo', said: 'Quanta escuma! Ara ve l’ànec.' },
  ],
}

/** Brush teeth: paste, then the brush. */
export const TEETH: UseChain = {
  stages: [
    { id: 'bruta', label: 'bruta', said: 'Aquesta dent està bruta.' },
    { id: 'pasta', label: 'amb pasta', tool: 'pasta', said: 'Una mica de pasta de dents.' },
    { id: 'neta', label: 'neta i brillant', tool: 'raspall', said: 'Raspall, raspall… Dents netes!' },
  ],
}

/** Water the plant three times and it grows from a seed to a flower. */
export const GROWING: UseChain = {
  stages: [
    { id: 'llavor', label: 'una llavor', said: 'Una llavoreta sota la terra.' },
    { id: 'brot', label: 'un brot', tool: 'regadora', said: 'Ha sortit un brotet!' },
    { id: 'planta', label: 'una planta', tool: 'regadora', said: 'Creix, creix!' },
    { id: 'florida', label: 'florida', tool: 'regadora', said: 'Ha florit! Quina flor més bonica!' },
  ],
}

const tool = (id: string, label: string, art: () => ReactNode, height = 0.2): InteractableDef => ({ id, label, height, pickup: true, tool: id, art })

/** Everything of the house that can be picked up or used. */
export const HOUSE_DEFS: readonly InteractableDef[] = [
  { id: 'nevera', label: 'la nevera', aspect: 0.6, height: 0.5, container: true, art: (s) => <FridgeArt open={s.open} /> },
  { id: 'poma', label: 'la poma', height: 0.2, pickup: true, use: COOKING, art: (s) => <AppleArt stage={s.stage} /> },
  tool('esponja', 'l’esponja', () => <SpongeArt />),
  tool('ganivet', 'el ganivet', () => <KnifeArt />),
  tool('olla', 'l’olla', () => <PotArt />),
  tool('plat', 'el plat', () => <PlateArt />, 0.16),
  { id: 'banyera', label: 'la banyera', aspect: 1.8, height: 0.22, use: BATH, art: (s) => <TubArt stage={s.stage} /> },
  tool('galleda', 'la galleda', () => <BucketArt />),
  tool('sabo', 'el sabó', () => <SoapArt />, 0.15),
  { id: 'anec', label: 'l’ànec de goma', height: 0.17, pickup: true, toss: true, art: () => <DuckArt /> },
  { id: 'dent', label: 'la dent', height: 0.2, use: TEETH, art: (s) => <ToothArt stage={s.stage} /> },
  tool('pasta', 'la pasta de dents', () => <PasteArt />, 0.15),
  tool('raspall', 'el raspall de dents', () => <BrushArt />, 0.2),
  { id: 'planta', label: 'la planta', height: 0.24, use: GROWING, art: (s) => <GrowArt stage={s.stage} /> },
  tool('regadora', 'la regadora', () => <CanArt />),
  { id: 'pilota', label: 'la pilota', height: 0.17, pickup: true, toss: true, art: () => <BallArt /> },
  { id: 'ou', label: 'l’ou sorpresa', height: 0.2, surprise: true, surpriseTaps: 3, surpriseOptions: ['un pollet', 'una estrella', 'un cor'], art: (s) => <EggArt charge={s.charge} revealed={s.revealed} /> },
]

export interface StartSpec {
  uid: string
  def: string
  room: string
  at: { x: number; y: number }
  inside?: string
}

/** Where everything starts (x over the whole floor, y of the feet). */
export const HOUSE_START: readonly StartSpec[] = [
  { uid: 'nevera', def: 'nevera', room: 'baixa', at: { x: 0.64, y: 0.66 } },
  { uid: 'poma-1', def: 'poma', room: 'baixa', at: { x: 0, y: 0 }, inside: 'nevera' },
  { uid: 'poma-2', def: 'poma', room: 'baixa', at: { x: 0, y: 0 }, inside: 'nevera' },
  { uid: 'esponja', def: 'esponja', room: 'baixa', at: { x: 0.74, y: 0.9 } },
  { uid: 'ganivet', def: 'ganivet', room: 'baixa', at: { x: 0.8, y: 0.8 } },
  { uid: 'olla', def: 'olla', room: 'baixa', at: { x: 0.58, y: 0.92 } },
  { uid: 'plat', def: 'plat', room: 'baixa', at: { x: 0.69, y: 0.93 } },
  { uid: 'banyera', def: 'banyera', room: 'pis', at: { x: 0.7, y: 0.7 } },
  { uid: 'galleda', def: 'galleda', room: 'pis', at: { x: 0.58, y: 0.9 } },
  { uid: 'sabo', def: 'sabo', room: 'pis', at: { x: 0.78, y: 0.92 } },
  { uid: 'anec', def: 'anec', room: 'pis', at: { x: 0.64, y: 0.82 } },
  { uid: 'dent', def: 'dent', room: 'pis', at: { x: 0.54, y: 0.68 } },
  { uid: 'pasta', def: 'pasta', room: 'pis', at: { x: 0.84, y: 0.9 } },
  { uid: 'raspall', def: 'raspall', room: 'pis', at: { x: 0.5, y: 0.92 } },
  { uid: 'planta', def: 'planta', room: 'golfes', at: { x: 0.78, y: 0.66 } },
  { uid: 'regadora', def: 'regadora', room: 'golfes', at: { x: 0.62, y: 0.9 } },
  { uid: 'pilota', def: 'pilota', room: 'golfes', at: { x: 0.74, y: 0.9 } },
  { uid: 'ou', def: 'ou', room: 'golfes', at: { x: 0.3, y: 0.84 } },
]
