import { lazy } from 'react'
import type { PlaceModule } from '../types'
import { GranjaFacade } from './GranjaFacade'
import { GRANJA_GAME_ID, GRANJA_SKILLS } from './granjaSkills'

/** La Granja: opens once multiplying has started, so sowing in rows comes first and sharing arrives with dividing. */
export const place: PlaceModule = {
  id: 'granja',
  title: 'la Granja',
  gameId: GRANJA_GAME_ID,
  skills: GRANJA_SKILLS,
  unlock: { operation: 'mul' },
  facade: GranjaFacade,
  Component: lazy(() => import('./GranjaPlace')),
}

export { requestHost } from './requestHost'
