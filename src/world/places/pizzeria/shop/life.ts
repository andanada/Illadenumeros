import type { LifeConfig } from '../../shared/doing/useCustomerLife'
import { ASK_SPOT, ROOM } from './rooms'

export const AVATAR = 'laia'
export const COOK = 'en-jordi'
export const WAITER = 'marta'
export const CUSTOMERS = ['la-fatima', 'l-avi-ramon', 'la-mei', 'en-kofi'] as const

export const LIFE: LifeConfig = {
  customers: CUSTOMERS,
  room: ROOM.dining,
  street: ROOM.street,
  entry: { x: 0.12, y: 0.7 },
  exit: { x: 0.09, y: 0.64 },
  ask: ASK_SPOT,
  browse: [
    { x: 0.3, y: 0.9 },
    { x: 0.5, y: 0.86 },
    { x: 0.7, y: 0.9 },
  ],
  staff: [
    { id: COOK, room: ROOM.kitchen, points: [{ x: 0.5, y: 0.84 }, { x: 0.36, y: 0.78 }, { x: 0.58, y: 0.6 }] },
    { id: WAITER, room: ROOM.dining, points: [{ x: 0.5, y: 0.66 }, { x: 0.74, y: 0.7 }, { x: 0.28, y: 0.7 }] },
  ],
}
