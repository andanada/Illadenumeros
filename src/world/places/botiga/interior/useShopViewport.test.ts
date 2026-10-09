import { describe, expect, it } from 'vitest'
import { shopViewport } from './useShopViewport'

describe('shopViewport', () => {
  it('landscape tablets and desktops get a big neighbour; phones a smaller one; always clamped', () => {
    expect(shopViewport(1024, 768)).toEqual({ portrait: false, neighbour: 276 })
    expect(shopViewport(1180, 820).neighbour).toBe(295)
    expect(shopViewport(390, 844)).toEqual({ portrait: true, neighbour: 169 })
    expect(shopViewport(320, 480).neighbour).toBe(120)
    expect(shopViewport(2560, 1440).neighbour).toBe(300)
  })
})
