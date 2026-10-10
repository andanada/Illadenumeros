import type { RequestHost } from '../../requests/requestHost'
import { MERCAT_ADAPTERS } from './errands/mercatAdapters'
import { ASKERS } from './market/cast'
import { MERCAT_GAME_ID, MERCAT_SKILLS } from './mercatSkills'

/**
 * What the Mercat gives the request system: shoppers and stallholders carry the bubbles; the answer is played on
 * the scale, with coins on the cashier tray, or on the market sheet (picture and price tags).
 */
export const requestHost: RequestHost = {
  placeId: 'mercat',
  anchors: ASKERS.map((actorId) => ({ actorId, x: 0.5, y: 0.74 })),
  adapters: MERCAT_ADAPTERS,
  gameId: MERCAT_GAME_ID,
  skillIds: MERCAT_SKILLS,
}
