import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { inspectMp3 } from './mp3'

/** One MPEG-1 Layer III frame at 32 kbit/s, 44.1 kHz (header 0xFFFB 0x10 0x00, 104 bytes, 26.1 ms). */
function frame(paddingBit = 0): Uint8Array {
  const length = Math.floor((144 * 32_000) / 44_100) + paddingBit
  const bytes = new Uint8Array(length)
  bytes.set([0xff, 0xfb, 0x10 | (paddingBit << 1), 0x00])
  return bytes
}

const join2 = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

describe('inspectMp3', () => {
  it('accepts a sequence of whole frames and measures the duration', () => {
    const info = inspectMp3(join2(frame(), frame(1), frame()))
    expect(info).toMatchObject({ valid: true, frames: 3, sampleRate: 44100, bitrateKbps: 32 })
    expect(info.durationSec).toBeCloseTo((3 * 1152) / 44100, 5)
  })

  it('skips an ID3v2 tag and tolerates a trailing ID3v1 tag', () => {
    const id3 = new Uint8Array(10 + 20)
    id3.set([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 20])
    const v1 = new Uint8Array(128)
    v1.set([0x54, 0x41, 0x47])
    expect(inspectMp3(join2(id3, frame(), frame(), v1)).valid).toBe(true)
  })

  it('rejects a file cut in the middle of a frame', () => {
    const whole = join2(frame(), frame(), frame())
    const info = inspectMp3(whole.slice(0, whole.length - 10))
    expect(info.valid).toBe(false)
    expect(info.reason).toMatch(/tallat/)
  })

  it('rejects an error page saved as .mp3, an empty file and garbage after the frames', () => {
    expect(inspectMp3(new TextEncoder().encode('<html>429 Too Many Requests</html>')).valid).toBe(false)
    expect(inspectMp3(new Uint8Array(0))).toMatchObject({ valid: false, reason: 'cap frame MP3' })
    expect(inspectMp3(join2(frame(), new Uint8Array([1, 2, 3, 4, 5, 6]))).valid).toBe(false)
  })

  it('rejects headers that are not Layer III or use a reserved rate', () => {
    const layer2 = frame()
    layer2[1] = 0xfd
    expect(inspectMp3(layer2).valid).toBe(false)
    const badRate = frame()
    badRate[2] = 0x1c
    expect(inspectMp3(badRate).valid).toBe(false)
    const freeFormat = frame()
    freeFormat[2] = 0x00
    expect(inspectMp3(freeFormat).valid).toBe(false)
  })

  it('reads MPEG-2 frames (the 16 kHz clips of the town)', () => {
    // MPEG-2 Layer III, 32 kbit/s (index 4), 16 kHz (index 2): 72 * 32000 / 16000 = 144 bytes, 576 samples.
    const bytes = new Uint8Array(144)
    bytes.set([0xff, 0xf3, 0x48, 0x00])
    expect(inspectMp3(bytes)).toMatchObject({ valid: true, frames: 1, sampleRate: 16000, bitrateKbps: 32 })
  })

  it.skipIf(!existsSync(join(__dirname, '..', '..', 'public', 'voice', 'manifest.json')))('every clip of the manifest is a valid MP3 of a plausible length', () => {
    const dir = join(__dirname, '..', '..', 'public', 'voice')
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as { clips: string[] }
    for (const key of manifest.clips) {
      const info = inspectMp3(readFileSync(join(dir, `${key}.mp3`)))
      expect(info.valid, `${key}: ${info.reason ?? ''}`).toBe(true)
      expect(info.durationSec).toBeGreaterThan(0.3)
      expect(info.durationSec).toBeLessThan(40)
    }
  }, 60_000)
})
