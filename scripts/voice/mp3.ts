/**
 * Structural check of an MP3 file (MPEG-1/2/2.5 Layer III): skips an ID3v2 tag, then walks frame by frame.
 * A clip is valid when every byte after the tag belongs to a frame (a trailing ID3v1 "TAG" is tolerated), which
 * catches truncated downloads and error pages saved as .mp3. No decoding, no dependency.
 */
export interface Mp3Info {
  readonly valid: boolean
  readonly reason?: string
  readonly frames: number
  readonly sampleRate: number
  /** Bitrate of the first frame, in kbit/s. */
  readonly bitrateKbps: number
  readonly durationSec: number
}

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
const SAMPLE_RATES: Readonly<Record<number, readonly number[]>> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] }

const fail = (reason: string, partial: Partial<Mp3Info> = {}): Mp3Info => ({ valid: false, reason, frames: 0, sampleRate: 0, bitrateKbps: 0, durationSec: 0, ...partial })

function id3v2Length(bytes: Uint8Array): number {
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return 0
  const size = ((bytes[6] ?? 0) << 21) | ((bytes[7] ?? 0) << 14) | ((bytes[8] ?? 0) << 7) | (bytes[9] ?? 0)
  return 10 + size
}

export function inspectMp3(bytes: Uint8Array): Mp3Info {
  let at = id3v2Length(bytes)
  const end = bytes.length >= 128 && bytes[bytes.length - 128] === 0x54 && bytes[bytes.length - 127] === 0x41 && bytes[bytes.length - 126] === 0x47 ? bytes.length - 128 : bytes.length
  let frames = 0
  let seconds = 0
  let firstRate = 0
  let firstBitrate = 0
  while (at + 4 <= end) {
    const b1 = bytes[at + 1] ?? 0
    const b2 = bytes[at + 2] ?? 0
    if (bytes[at] !== 0xff || (b1 & 0xe0) !== 0xe0) return fail(`frame no vàlid al byte ${at}`, { frames })
    const version = (b1 >> 3) & 3
    const layer = (b1 >> 1) & 3
    const bitrateIndex = b2 >> 4
    const rateIndex = (b2 >> 2) & 3
    const padding = (b2 >> 1) & 1
    if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return fail(`capçalera no suportada al byte ${at}`, { frames })
    const rate = SAMPLE_RATES[version]?.[rateIndex] ?? 0
    const kbps = (version === 3 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex] ?? 0
    const samples = version === 3 ? 1152 : 576
    const length = Math.floor(((version === 3 ? 144 : 72) * kbps * 1000) / rate) + padding
    if (at + length > end) return fail('fitxer tallat al mig d’un frame', { frames })
    if (frames === 0) {
      firstRate = rate
      firstBitrate = kbps
    }
    frames += 1
    seconds += samples / rate
    at += length
  }
  if (frames === 0) return fail('cap frame MP3')
  if (at !== end) return fail(`${end - at} bytes sobrants al final`, { frames })
  return { valid: true, frames, sampleRate: firstRate, bitrateKbps: firstBitrate, durationSec: seconds }
}
