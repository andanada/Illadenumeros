import type { RequestHost } from '../../requests/requestHost'
import { ASKERS } from './farm/cast'
import { GRANJA_ADAPTERS } from './errands/granjaAdapters'
import { GRANJA_GAME_ID, GRANJA_SKILLS } from './granjaSkills'

/**
 * What the Granja gives the request system: the farmer and the visiting neighbours carry the bubbles; the
 * answer is played with the farm's own tasks (rows of seeds, bowls to share, egg boxes) or the price-tag sheet.
 */
export const requestHost: RequestHost = {
  placeId: 'granja',
  anchors: ASKERS.map((actorId) => ({ actorId, x: 0.5, y: 0.7 })),
  adapters: GRANJA_ADAPTERS,
  gameId: GRANJA_GAME_ID,
  skillIds: GRANJA_SKILLS,
}
