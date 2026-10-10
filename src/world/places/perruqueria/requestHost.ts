import type { RequestHost } from '../../requests/requestHost'
import { PERRUQUERIA_ADAPTERS } from './errands/perruqueriaAdapters'
import { PERRUQUERIA_GAME_ID, PERRUQUERIA_SKILLS } from './perruqueriaSkills'
import { SEATS } from './salon/layout'
import { CUSTOMERS } from './salon/useSalonLife'

const chair = SEATS[0]?.at ?? { x: 0.36, y: 0.72 }

/**
 * What the Perruqueria gives the request system: the customer who asks sits in the first chair with a
 * bubble; the answer is played with the clips adapter (or the price tags), in the place's own sheet.
 */
export const requestHost: RequestHost = {
  placeId: 'perruqueria',
  anchors: CUSTOMERS.map((actorId) => ({ actorId, x: chair.x, y: chair.y })),
  adapters: PERRUQUERIA_ADAPTERS,
  gameId: PERRUQUERIA_GAME_ID,
  skillIds: PERRUQUERIA_SKILLS,
}
