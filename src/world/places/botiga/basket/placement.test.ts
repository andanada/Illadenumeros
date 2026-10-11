import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import { slotPoints } from '../../../sandbox/logic/zones'
import { drawerRect, changeZone, handRect } from '../change/changeSpec'
import { basketFromItem } from '../errands/basketLogic'
import { payFromItem } from '../errands/payLogic'
import { basketZones, cratePile } from './basketSpec'

const base = { id: 'x', skillId: 'A4', text: '10 + 10 = ?', speech: '', answer: '20', choices: [], visual: { kind: 'none' }, hintVisual: { kind: 'none' }, hints: ['a', 'b', 'c'], cpaStage: 'concret', operands: { a: 10, b: 10, op: '+' } } as unknown as Item

/** Feet (y) of the lowest slot of a zone. */
const lowestSlot = (zone: { rect: { x: number; y: number; w: number; h: number }; id: string; room: string; capacity?: number; cols?: number }): number => Math.max(...slotPoints(zone).map((p) => p.y))

describe('a pile never hides behind the zone it is carried to', () => {
  const sum = basketFromItem(base)
  const take = basketFromItem({ ...base, text: '20 − 5 = ?', answer: '15', operands: { a: 20, b: 5, op: '-' } })
  const pay = payFromItem({ ...base, text: 'Quant canvi?', answer: '3,40 €' })
  if (!sum || !take || !pay) throw new Error('sense tasca')

  it('both layouts: the pile and the zone have their own columns, so a character over one never covers the other', () => {
    const phone = 390
    for (const compact of [false, true]) {
      const [basket, off] = basketZones(take, compact)
      const pile = cratePile(compact)
      // Centre-to-centre of the nearest pieces is more than a 64 px touch target (at phone width, the narrowest screen).
      const gap = (basket?.rect.x ?? 0) - (pile.x + pile.w)
      expect(gap).toBeGreaterThan(0.04)
      const coins = drawerRect(compact)
      expect(handRect(compact).x - (coins.x + coins.w)).toBeGreaterThan(0.04)
      // The box for what is taken out is a column of its own too, left of the basket.
      if (!basket || !off) throw new Error('sense caixa')
      expect(basket.rect.x - (off.rect.x + off.rect.w)).toBeGreaterThan(0.04)
    }
    const c = basketZones(sum, true)[0]
    const nearest = (c?.rect.x ?? 0) + 0.084 / 2 - (cratePile(true).x + cratePile(true).w - 0.06 / 2)
    expect(nearest * phone).toBeGreaterThanOrEqual(64)
    expect(pay.drawer.length).toBeGreaterThan(0)
    expect(lowestSlot(changeZone(pay, true))).toBeLessThanOrEqual(0.97)
  })

  it('everything stays on the stage in both layouts', () => {
    for (const compact of [false, true]) {
      for (const z of [...basketZones(sum, compact), ...basketZones(take, compact), changeZone(pay, compact)]) {
        expect(z.rect.x).toBeGreaterThanOrEqual(0)
        expect(z.rect.x + z.rect.w).toBeLessThanOrEqual(1)
        expect(z.rect.y).toBeGreaterThan(0.46)
        expect(z.rect.y + z.rect.h).toBeLessThanOrEqual(0.97)
      }
    }
  })
})
