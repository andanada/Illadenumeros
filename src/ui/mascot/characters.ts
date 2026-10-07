import type { CharacterId } from '../../core/storage/db'

export type EarStyle = 'hood-long' | 'cat' | 'dog' | 'cloud' | 'hood-bunny'

export interface CharacterDef {
  id: CharacterId
  name: string
  description: string
  ears: EarStyle
  /** Main fur / hood colour. */
  primary: string
  /** Darker shade for ears and outlines. */
  secondary: string
  face: string
  accent: string
  eye: string
}

/** Original characters (inspired by kawaii style; no third-party designs). */
export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  nyx: {
    id: 'nyx',
    name: 'Nyx',
    description: 'Conilleta punk amb caputxa fosca',
    ears: 'hood-long',
    primary: '#2b2140',
    secondary: '#191226',
    face: '#ffffff',
    accent: '#d946ef',
    eye: '#3b0764',
  },
  mixa: {
    id: 'mixa',
    name: 'Mixa',
    description: 'Gateta blanca amb llaç',
    ears: 'cat',
    primary: '#ffffff',
    secondary: '#e9d5ff',
    face: '#ffffff',
    accent: '#a855f7',
    eye: '#1f2937',
  },
  blau: {
    id: 'blau',
    name: 'Blau',
    description: 'Gosset blau entremaliat',
    ears: 'dog',
    primary: '#60a5fa',
    secondary: '#1d4ed8',
    face: '#fde7c7',
    accent: '#f59e0b',
    eye: '#0f172a',
  },
  nuvol: {
    id: 'nuvol',
    name: 'Núvol',
    description: 'Cadellet de núvol',
    ears: 'cloud',
    primary: '#ffffff',
    secondary: '#dbeafe',
    face: '#ffffff',
    accent: '#38bdf8',
    eye: '#1e3a8a',
  },
  melo: {
    id: 'melo',
    name: 'Melo',
    description: 'Conilleta rosa amb caputxa',
    ears: 'hood-bunny',
    primary: '#f9a8d4',
    secondary: '#ec4899',
    face: '#ffffff',
    accent: '#fde047',
    eye: '#3f1d38',
  },
}

export type Mood = 'salut' | 'content' | 'pensa' | 'anims' | 'balla'
