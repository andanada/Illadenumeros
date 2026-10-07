export interface Sticker {
  id: string
  emoji: string
  name: string
  region: 'bosc' | 'platja' | 'castell'
}

/** Original sticker collection (emoji-based, no third-party artwork). */
export const STICKERS: Sticker[] = [
  { id: 'maduixa', emoji: '🍓', name: 'Maduixa', region: 'bosc' },
  { id: 'arc', emoji: '🌈', name: 'Arc de Sant Martí', region: 'bosc' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn', region: 'bosc' },
  { id: 'flor', emoji: '🌸', name: 'Flor de cirerer', region: 'bosc' },
  { id: 'papallona', emoji: '🦋', name: 'Papallona', region: 'bosc' },
  { id: 'gira-sol', emoji: '🌻', name: 'Gira-sol', region: 'bosc' },
  { id: 'trevol', emoji: '🍀', name: 'Trèvol de la sort', region: 'bosc' },
  { id: 'guineu', emoji: '🦊', name: 'Guineu', region: 'bosc' },
  { id: 'panda', emoji: '🐼', name: 'Panda', region: 'bosc' },
  { id: 'conill', emoji: '🐰', name: 'Conillet', region: 'bosc' },
  { id: 'lluna', emoji: '🌙', name: 'Lluna', region: 'bosc' },
  { id: 'estel', emoji: '⭐', name: 'Estel', region: 'bosc' },
  { id: 'dofi', emoji: '🐬', name: 'Dofí', region: 'platja' },
  { id: 'tortuga', emoji: '🐢', name: 'Tortuga', region: 'platja' },
  { id: 'gelat', emoji: '🍦', name: 'Gelat', region: 'platja' },
  { id: 'sindria', emoji: '🍉', name: 'Síndria', region: 'platja' },
  { id: 'petxina', emoji: '🐚', name: 'Petxina', region: 'platja' },
  { id: 'pop', emoji: '🐙', name: 'Pop', region: 'platja' },
  { id: 'pingui', emoji: '🐧', name: 'Pingüí', region: 'platja' },
  { id: 'globus', emoji: '🎈', name: 'Globus', region: 'platja' },
  { id: 'piruleta', emoji: '🍭', name: 'Piruleta', region: 'platja' },
  { id: 'sol', emoji: '☀️', name: 'Sol', region: 'platja' },
  { id: 'cranc', emoji: '🦀', name: 'Cranc', region: 'platja' },
  { id: 'balena', emoji: '🐳', name: 'Balena', region: 'platja' },
  { id: 'corona', emoji: '👑', name: 'Corona', region: 'castell' },
  { id: 'diamant', emoji: '💎', name: 'Diamant', region: 'castell' },
  { id: 'magdalena', emoji: '🧁', name: 'Magdalena', region: 'castell' },
  { id: 'donut', emoji: '🍩', name: 'Dònut', region: 'castell' },
  { id: 'pastis', emoji: '🎂', name: 'Pastís', region: 'castell' },
  { id: 'llac', emoji: '🎀', name: 'Llaç', region: 'castell' },
  { id: 'cor-negre', emoji: '🖤', name: 'Cor punk', region: 'castell' },
  { id: 'calavera', emoji: '💀', name: 'Calavereta', region: 'castell' },
  { id: 'castell', emoji: '🏰', name: 'Castell', region: 'castell' },
  { id: 'coet', emoji: '🚀', name: 'Coet', region: 'castell' },
  { id: 'planeta', emoji: '🪐', name: 'Planeta', region: 'castell' },
  { id: 'musica', emoji: '🎵', name: 'Música', region: 'castell' },
]
