import type { CharacterId } from '../../core/storage/db'
import { CHARACTERS } from '../../ui/mascot/characters'

/** Said (and shown) on the welcome step, with her first pet. */
export function welcomeText(name: string, pet: CharacterId): string {
  return `Hola, ${name}! Avui és el teu primer dia al poble i ${CHARACTERS[pet].name} t’acompanya. Els veïns ja t’esperen!`
}
