import { lazy } from 'react'
import type { PlaceModule } from '../types'
import { FlecaFacade } from './FlecaFacade'
import { FLECA_GAME_ID, FLECA_SKILLS } from './flecaSkills'

/** La Fleca: a bakery to play in; the customers ask for trays and boxes in rows (opens with multiplication). */
export const place: PlaceModule = {
  id: 'fleca',
  title: 'la Fleca',
  gameId: FLECA_GAME_ID,
  skills: FLECA_SKILLS,
  unlock: { operation: 'mul' },
  facade: FlecaFacade,
  Component: lazy(() => import('./FlecaPlace')),
}

export { requestHost } from './requestHost'
