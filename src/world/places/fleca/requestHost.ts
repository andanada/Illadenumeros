import type { RequestHost } from '../../requests/requestHost'
import { FLECA_GAME_ID, FLECA_SKILLS } from './flecaSkills'
import { FLECA_ADAPTERS } from './tasks/flecaAdapters'
import { ASK_SPOT } from './shop/rooms'
import { CUSTOMERS } from './shop/life'

/**
 * What the Fleca gives the request system: the customers wait at the asking spot with a bubble; the answer is
 * laid out with the hands on trays (or with the price tags), in the place's own scene.
 */
export const requestHost: RequestHost = {
  placeId: 'fleca',
  anchors: CUSTOMERS.map((actorId) => ({ actorId, x: ASK_SPOT.x, y: ASK_SPOT.y })),
  adapters: FLECA_ADAPTERS,
  gameId: FLECA_GAME_ID,
  skillIds: FLECA_SKILLS,
}
