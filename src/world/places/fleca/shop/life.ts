import type { LifeConfig } from '../../shared/doing/useCustomerLife'
import { ASK_SPOT, ROOM } from './rooms'

export const AVATAR = 'laia'
export const BAKER = 'en-pau'
export const CUSTOMERS = ['senyora-pilar', 'la-fatima', 'en-kofi', 'la-mei'] as const

export const LIFE: LifeConfig = {
  customers: CUSTOMERS,
  room: ROOM.shop,
  street: ROOM.street,
  entry: { x: 0.12, y: 0.7 },
  exit: { x: 0.09, y: 0.64 },
  ask: ASK_SPOT,
  browse: [
    { x: 0.32, y: 0.74 },
    { x: 0.44, y: 0.82 },
    { x: 0.6, y: 0.74 },
  ],
  staff: [{ id: BAKER, room: ROOM.oven, points: [{ x: 0.5, y: 0.82 }, { x: 0.3, y: 0.78 }, { x: 0.58, y: 0.62 }] }],
}
