import type { CharacterId } from '../../core/storage/db'
import { CHARACTERS } from '../../ui/mascot/characters'

export function welcomeText(name: string, character: CharacterId): string {
  return `Hola, ${name}! Sóc ${CHARACTERS[character].name}. Anem a descobrir l’illa dels números!`
}

