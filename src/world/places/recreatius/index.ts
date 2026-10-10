import { lazy } from 'react'
import type { PlaceModule } from '../types'
import { RecreatiusFacade } from './RecreatiusFacade'
import { RECREATIUS_GAME_ID, RECREATIUS_SKILLS } from './recreatiusSkills'

/** Els Recreatius: the arcade with the speed games as cabinets (open from day one). */
export const place: PlaceModule = {
  id: 'recreatius',
  title: 'Els Recreatius',
  gameId: RECREATIUS_GAME_ID,
  skills: RECREATIUS_SKILLS,
  unlock: 'always',
  facade: RecreatiusFacade,
  Component: lazy(() => import('./RecreatiusPlace')),
}

export { requestHost } from './requestHost'
