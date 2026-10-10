import { describe, expect, it } from 'vitest'
import { frameAt, PHOTO_FRAMES, photoSaid } from './photoFrames'

describe('photo frames', () => {
  it('cycles through distinct frames, also backwards', () => {
    expect(new Set(PHOTO_FRAMES.map((f) => f.id)).size).toBe(PHOTO_FRAMES.length)
    expect(frameAt(0)).not.toBe(frameAt(1))
    expect(frameAt(PHOTO_FRAMES.length)).toBe(frameAt(0))
    expect(frameAt(-1)).toBe(frameAt(PHOTO_FRAMES.length - 1))
  })

  it('every frame has stickers and a Catalan line', () => {
    for (const f of PHOTO_FRAMES) expect(f.stickers.length).toBeGreaterThanOrEqual(3)
    expect(photoSaid('la Laia', frameAt(1))).toMatch(/^Clic! Foto de la Laia amb el marc/)
  })
})
