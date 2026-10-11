import type { RequestHost } from '../../requests/requestHost'
import { CASA_GAME_ID, CASA_SKILLS } from './casaSkills'
import { MEMBERS } from './house/family'
import { CASA_ADAPTERS } from './kitchen/casaAdapters'

/** What the house gives the request system: whose bubbles and how each is played (in the house itself, with the hands). */
export const requestHost: RequestHost = {
  placeId: 'casa',
  anchors: [...MEMBERS.map((m) => ({ actorId: m.id, x: m.at.x, y: m.at.y })), { actorId: 'mascota', x: 0.4, y: 0.88 }],
  adapters: CASA_ADAPTERS,
  gameId: CASA_GAME_ID,
  skillIds: CASA_SKILLS,
}
