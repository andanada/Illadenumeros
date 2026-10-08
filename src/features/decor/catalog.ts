/** Places of the pet's house. Only one item can stand in each spot at a time. */
export const SPOTS = ['sostre', 'finestra', 'paret', 'prestatge', 'terra-esq', 'terra-dre', 'llit', 'raco'] as const
export type Spot = (typeof SPOTS)[number]

export const SPOT_LABEL: Readonly<Record<Spot, string>> = {
  sostre: 'Sostre',
  finestra: 'Finestra',
  paret: 'Paret',
  prestatge: 'Prestatge',
  'terra-esq': 'Terra (esquerra)',
  'terra-dre': 'Terra (dreta)',
  llit: 'Llit',
  raco: 'Racó',
}

export interface DecorItem {
  /** Stored in the progress: never rename. Lower-case with dashes (same format as sticker ids). */
  id: string
  emoji: string
  name: string
  /** Price in petals. */
  price: number
  spot: Spot
}

export const DECOR: readonly DecorItem[] = [
  { id: 'garlanda', emoji: '🎏', name: 'Garlanda de colors', price: 8, spot: 'sostre' },
  { id: 'farolet', emoji: '🏮', name: 'Farolet rosa', price: 15, spot: 'sostre' },
  { id: 'estrelles-sostre', emoji: '🌟', name: 'Estrelles brillants', price: 30, spot: 'sostre' },
  { id: 'cortina', emoji: '🪟', name: 'Finestra amb vistes', price: 10, spot: 'finestra' },
  { id: 'planta-finestra', emoji: '🪴', name: 'Test de flors', price: 14, spot: 'finestra' },
  { id: 'arc-finestra', emoji: '🌈', name: 'Arc de Sant Martí', price: 28, spot: 'finestra' },
  { id: 'quadre', emoji: '🖼️', name: 'Quadre', price: 10, spot: 'paret' },
  { id: 'rellotge', emoji: '🕰️', name: 'Rellotge de paret', price: 18, spot: 'paret' },
  { id: 'guitarra', emoji: '🎸', name: 'Guitarra punk', price: 35, spot: 'paret' },
  { id: 'llibres', emoji: '📚', name: 'Pila de llibres', price: 8, spot: 'prestatge' },
  { id: 'trofeu', emoji: '🏆', name: 'Trofeu', price: 25, spot: 'prestatge' },
  { id: 'globus-terraqui', emoji: '🌐', name: 'Globus terraqüi', price: 20, spot: 'prestatge' },
  { id: 'peluix', emoji: '🧸', name: 'Os de peluix', price: 12, spot: 'terra-esq' },
  { id: 'catifa', emoji: '🧶', name: 'Cabdell de llana', price: 9, spot: 'terra-esq' },
  { id: 'pilota', emoji: '⚽', name: 'Pilota', price: 16, spot: 'terra-esq' },
  { id: 'planta-gran', emoji: '🌵', name: 'Cactus content', price: 12, spot: 'terra-dre' },
  { id: 'pianet', emoji: '🎹', name: 'Piano petit', price: 40, spot: 'terra-dre' },
  { id: 'cavallet', emoji: '🎠', name: 'Cavallet de fira', price: 45, spot: 'terra-dre' },
  { id: 'llit-nuvol', emoji: '☁️', name: 'Llit de núvol', price: 20, spot: 'llit' },
  { id: 'llit-castell', emoji: '🏰', name: 'Llit de castell', price: 50, spot: 'llit' },
  { id: 'llit-coet', emoji: '🚀', name: 'Llit de coet', price: 60, spot: 'llit' },
  { id: 'peixera', emoji: '🐠', name: 'Peixera', price: 22, spot: 'raco' },
  { id: 'lampara', emoji: '🪔', name: 'Làmpada màgica', price: 18, spot: 'raco' },
  { id: 'telescopi', emoji: '🔭', name: 'Telescopi', price: 32, spot: 'raco' },
]

export const decorById = (id: string): DecorItem | undefined => DECOR.find((d) => d.id === id)
