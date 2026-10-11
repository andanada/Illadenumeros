import type { RequestHost } from '../../requests/requestHost'
import { RECREATIUS_ADAPTERS } from './prizes/prizeMode'
import { RECREATIUS_GAME_ID, RECREATIUS_SKILLS } from './recreatiusSkills'
import { CABINET_SPOTS, CLERK_ID } from './room/layout'

/**
 * What the arcade tells the request system. The first need is the warm-up bubble over the Duel cabinet (a round of
 * it answers it); a second one is the clerk's prize count, played with toys from the counter shelf onto
 * the clerk's tray (the price tags only for what does not fit). The cabinets themselves keep recording under their own game ids.
 */
export const requestHost: RequestHost = {
  placeId: 'recreatius',
  anchors: [
    { actorId: 'duel', x: CABINET_SPOTS.duel.x, y: CABINET_SPOTS.duel.y },
    { actorId: CLERK_ID, x: 0.91, y: 0.6 },
  ],
  adapters: RECREATIUS_ADAPTERS,
  gameId: RECREATIUS_GAME_ID,
  skillIds: RECREATIUS_SKILLS,
}
