import { lazy } from 'react'
import type { PlaceModule } from '../types'
import { AUTOBUS_GAME_ID, AUTOBUS_SKILLS } from './autobusSkills'

/** L’Autobús: the bus line of the town, plugged into the street (open from day one). */
export const place: PlaceModule = {
  id: 'autobus',
  title: 'L’Autobús',
  gameId: AUTOBUS_GAME_ID,
  skills: AUTOBUS_SKILLS,
  unlock: 'always',
  facade: 'parada-autobus',
  Component: lazy(() => import('./AutobusPlace')),
}

export { requestHost } from './requestHost'
