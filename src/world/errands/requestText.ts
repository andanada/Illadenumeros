import type { Item } from '../../core/ambit/types'
import { NEIGHBOURS } from '../characters'

/** The neighbour of the n-th visit: the town's named presets take turns. */
export function neighbourFor(visit: number): { id: string; name: string } {
  const n = NEIGHBOURS.length
  const preset = NEIGHBOURS[((visit % n) + n) % n]
  return preset ? { id: preset.id, name: preset.name } : { id: `vei-${visit}`, name: 'Veí' }
}

/** "de" + a name with its article, as Catalan contracts it: d’en Jordi, de la Núria, de l’avi Ramon, de la Senyora Pilar. */
export function ofName(name: string): string {
  if (/^En /.test(name)) return `d’en ${name.slice(3)}`
  if (/^La /.test(name)) return `de la ${name.slice(3)}`
  if (/^L['’]/.test(name)) return `de l’${name.slice(2)}`
  if (/^Senyor/.test(name)) return `de la ${name}`.replace('de la Senyor ', 'del senyor ').replace('de la Senyora', 'de la senyora')
  return `de ${name}`
}

/** Bubble for an item no adapter takes: the engine's own text and speech, so every item is playable. */
export const fallbackRequest = (item: Item): { text: string; speech: string } => ({ text: item.text, speech: item.speech || item.text })

/** "1 poma", "7 pomes". */
export const countWord = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`
