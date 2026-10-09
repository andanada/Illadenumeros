import { describe, expect, it } from 'vitest'
import { defaultAvatar } from '../characters/wearables'
import { isWearable, wearGift } from './wearGift'

const spec = defaultAvatar('nuvol', 'menta')

describe('wearGift', () => {
  it('puts clothes on in their slot, keeping her colour, without mutating', () => {
    const frozen = Object.freeze({ ...spec })
    expect(wearGift(frozen, { id: 'jaqueta', kind: 'top' }).top).toEqual({ item: 'jaqueta', color: spec.top.color })
    expect(wearGift(frozen, { id: 'bermudes', kind: 'bottom' }).bottom.item).toBe('bermudes')
    expect(wearGift(frozen, { id: 'sandalies', kind: 'shoes' }).shoes.item).toBe('sandalies')
    expect(frozen.top).toEqual(spec.top)
  })

  it('an accessory gets a colour even when she wore none', () => {
    expect(wearGift({ ...spec, accessory: null }, { id: 'corona', kind: 'accessory' }).accessory).toEqual({ item: 'corona', color: 'mango' })
  })

  it('furniture is not worn', () => {
    expect(wearGift(spec, { id: 'sofa', kind: 'furniture' })).toBe(spec)
    expect(isWearable({ kind: 'furniture' })).toBe(false)
    expect(isWearable({ kind: 'accessory' })).toBe(true)
  })
})
