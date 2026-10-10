import { lazy } from 'react'
import type { PlaceModule } from '../types'
import { MercatFacade } from './MercatFacade'
import { MERCAT_GAME_ID, MERCAT_SKILLS } from './mercatSkills'

/** El Mercat: the fifth-grade place; it opens with the region of 5è (decimals, percentages, fractions). */
export const place: PlaceModule = {
  id: 'mercat',
  title: 'el Mercat',
  gameId: MERCAT_GAME_ID,
  skills: MERCAT_SKILLS,
  unlock: { grade: 5 },
  facade: MercatFacade,
  Component: lazy(() => import('./MercatPlace')),
}

export { requestHost } from './requestHost'
