import type { RequestHost } from '../../requests/requestHost'
import { BOTIGA_GAME_ID, BOTIGA_SKILLS } from './botigaSkills'
import { BOTIGA_ADAPTERS } from './errands/botigaAdapters'
import { COUNTER_SPOTS } from './shop/rooms'
import { CUSTOMERS } from './shop/useShopLife'

/**
 * What the Botiga gives the request system: the customers wait at the counter with a bubble; the answer is
 * played with the usual adapters (basket, change, price tags), which the place's own sheet renders.
 */
export const requestHost: RequestHost = {
  placeId: 'botiga',
  anchors: CUSTOMERS.map((actorId) => ({ actorId, x: COUNTER_SPOTS[0].at.x, y: COUNTER_SPOTS[0].at.y })),
  adapters: BOTIGA_ADAPTERS,
  gameId: BOTIGA_GAME_ID,
  skillIds: BOTIGA_SKILLS,
}
