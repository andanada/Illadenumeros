import type { RequestHost } from '../../requests/requestHost'
import { AUTOBUS_GAME_ID, AUTOBUS_SKILLS } from './autobusSkills'
import { AUTOBUS_ADAPTERS } from './errands/autobusAdapters'
import { SEAT_SPOTS } from './world/busLayout'
import { REGULARS } from './world/riders'

/**
 * What the bus tells the request system: the three regulars sit in the first seats and carry the bubbles; the
 * answer is given by moving people on and off, or by driving along the numbered stops (the existing adapters).
 */
export const requestHost: RequestHost = {
  placeId: 'autobus',
  anchors: REGULARS.map((actorId, i) => ({ actorId, x: SEAT_SPOTS[i]?.at.x ?? 0.1, y: SEAT_SPOTS[i]?.at.y ?? 0.67 })),
  adapters: AUTOBUS_ADAPTERS,
  gameId: AUTOBUS_GAME_ID,
  skillIds: AUTOBUS_SKILLS,
}
