/** The funny frames of the photo booth: each one is a colour, a border and a few stickers around the face. Pure data. */
export interface PhotoFrame {
  readonly id: string
  /** Catalan, for the announcement. */
  readonly name: string
  readonly bg: string
  readonly border: string
  /** Stickers (emoji) at fractions of the picture, with a rotation in degrees. */
  readonly stickers: ReadonlyArray<{ readonly glyph: string; readonly x: number; readonly y: number; readonly rot: number; readonly size: number }>
}

export const PHOTO_FRAMES: readonly PhotoFrame[] = [
  { id: 'estrelles', name: 'el marc d’estrelles', bg: '#ffe9a8', border: '#ffb834', stickers: [{ glyph: '⭐', x: 0.1, y: 0.12, rot: -12, size: 1 }, { glyph: '✨', x: 0.88, y: 0.14, rot: 10, size: 0.9 }, { glyph: '⭐', x: 0.86, y: 0.84, rot: 14, size: 0.8 }] },
  { id: 'gelat', name: 'el marc de gelats', bg: '#ffd1e3', border: '#ff8dba', stickers: [{ glyph: '🍦', x: 0.1, y: 0.15, rot: -14, size: 1.1 }, { glyph: '🍓', x: 0.88, y: 0.82, rot: 12, size: 0.9 }, { glyph: '🍦', x: 0.9, y: 0.16, rot: 16, size: 0.8 }] },
  { id: 'coets', name: 'el marc de coets', bg: '#c9e6ff', border: '#4da6ec', stickers: [{ glyph: '🚀', x: 0.12, y: 0.14, rot: 20, size: 1 }, { glyph: '🌟', x: 0.88, y: 0.2, rot: -10, size: 0.9 }, { glyph: '🪐', x: 0.86, y: 0.84, rot: 8, size: 1 }] },
  { id: 'gats', name: 'el marc de gats', bg: '#d9f3d0', border: '#a8d143', stickers: [{ glyph: '🐱', x: 0.1, y: 0.14, rot: -8, size: 1.1 }, { glyph: '🐟', x: 0.9, y: 0.84, rot: 18, size: 0.9 }, { glyph: '💚', x: 0.88, y: 0.14, rot: 10, size: 0.8 }] },
  { id: 'festa', name: 'el marc de festa', bg: '#e6d9ff', border: '#9a7be6', stickers: [{ glyph: '🎉', x: 0.1, y: 0.14, rot: -16, size: 1.1 }, { glyph: '🎈', x: 0.9, y: 0.18, rot: 12, size: 1 }, { glyph: '🎂', x: 0.86, y: 0.84, rot: -6, size: 0.9 }] },
  { id: 'arc', name: 'el marc de l’arc de Sant Martí', bg: '#fff0d6', border: '#ff6b5b', stickers: [{ glyph: '🌈', x: 0.14, y: 0.14, rot: -10, size: 1.2 }, { glyph: '☀️', x: 0.88, y: 0.14, rot: 8, size: 1 }, { glyph: '🌼', x: 0.88, y: 0.84, rot: 14, size: 0.9 }] },
]

/** The n-th frame, cycling: every «Una altra!» gives a different one. */
export const frameAt = (n: number): PhotoFrame => PHOTO_FRAMES[((n % PHOTO_FRAMES.length) + PHOTO_FRAMES.length) % PHOTO_FRAMES.length] ?? (PHOTO_FRAMES[0] as PhotoFrame)

/** The spoken line after a photo. */
export const photoSaid = (who: string, frame: PhotoFrame): string => `Clic! Foto de ${who} amb ${frame.name}.`
