import type { RequestHost } from '../../requests/requestHost'
import { PIZZERIA_GAME_ID, PIZZERIA_SKILLS } from './pizzeriaSkills'
import { CUSTOMERS } from './shop/life'
import { ASK_SPOT } from './shop/rooms'
import { PIZZERIA_ADAPTERS } from './tasks/pizzeriaAdapters'

/**
 * What the Pizzeria gives the request system: the customers wait in the dining room with a bubble; the answer is
 * dealt onto plates or cut from a pizza in the rooms themselves (or played with the price tags).
 */
export const requestHost: RequestHost = {
  placeId: 'pizzeria',
  anchors: CUSTOMERS.map((actorId) => ({ actorId, x: ASK_SPOT.x, y: ASK_SPOT.y })),
  adapters: PIZZERIA_ADAPTERS,
  gameId: PIZZERIA_GAME_ID,
  skillIds: PIZZERIA_SKILLS,
}
