import { lazy } from 'react'
import type { PlaceModule } from '../types'
import { PizzeriaFacade } from './PizzeriaFacade'
import { PIZZERIA_GAME_ID, PIZZERIA_SKILLS } from './pizzeriaSkills'

/** La Pizzeria: a pizzeria to play in; sharing and fractions are done with slices and plates (opens with division). */
export const place: PlaceModule = {
  id: 'pizzeria',
  title: 'la Pizzeria',
  gameId: PIZZERIA_GAME_ID,
  skills: PIZZERIA_SKILLS,
  unlock: { operation: 'div' },
  facade: PizzeriaFacade,
  Component: lazy(() => import('./PizzeriaPlace')),
}

export { requestHost } from './requestHost'
