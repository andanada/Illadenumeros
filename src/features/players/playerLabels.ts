import type { PlayerSummary } from '../../core/storage/registry'
import { CHARACTERS } from '../../ui/mascot/characters'

/** "Laia", or "Laia (Nyx)" when another player has the same name. */
export const playerLabel = (player: Pick<PlayerSummary, 'name' | 'character'>, withCharacter: boolean): string =>
  withCharacter ? `${player.name} (${CHARACTERS[player.character].name})` : player.name

const DAY_MS = 24 * 60 * 60 * 1000
const dayStart = (at: number): number => new Date(new Date(at).toDateString()).getTime()

/** Small hint under each card: "Darrer cop: avui", "ahir", or the date. */
export function lastPlayedLabel(lastPlayedAt: number, now: number): string {
  const days = Math.round((dayStart(now) - dayStart(lastPlayedAt)) / DAY_MS)
  if (days <= 0) return 'Darrer cop: avui'
  if (days === 1) return 'Darrer cop: ahir'
  return `Darrer cop: ${new Date(lastPlayedAt).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' })}`
}
