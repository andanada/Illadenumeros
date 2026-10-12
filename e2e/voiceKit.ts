import type { Page } from '@playwright/test'

/** Shared by the voice specs: stands in for Web Audio clips (a tiny silent WAV) and for the device voice, and counts both. */
/** 0.2 s of 16-bit mono silence as a WAV: decodeAudioData sniffs the content, so it stands in for a tiny MP3. */
export function silentWav(): Buffer {
  const samples = 1600
  const data = Buffer.alloc(samples * 2)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(8000, 24)
  header.writeUInt32LE(16000, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

export interface Probe {
  clipStarts: number
  deviceUtterances: string[]
  /** Everything that was said, in order and never cleared: a clip started, or the device voice was asked for `text`. */
  log: { kind: 'clip' | 'device'; text?: string; at: number }[]
}

export async function installProbes(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: Probe = { clipStarts: 0, deviceUtterances: [], log: [] }
    ;(window as unknown as { __voice: Probe }).__voice = probe
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      probe.clipStarts += 1
      probe.log.push({ kind: 'clip', at: performance.now() })
      return start.apply(this, args)
    }
    // A Catalan device voice that records what it is asked to say, so the fallback is observable.
    const voice = { lang: 'ca-ES', name: 'Test', default: true, localService: true, voiceURI: 'test' }
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [voice],
        // Like a real browser, cancel() drops what is queued: React StrictMode speaks twice in dev, one is audible.
        speak: (utterance: { text: string }) => {
          probe.log.push({ kind: 'device', text: utterance.text, at: performance.now() })
          probe.deviceUtterances.push(utterance.text)
        },
        cancel: () => probe.deviceUtterances.splice(0),
        addEventListener: () => undefined,
      },
    })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        text: string
        constructor(text: string) {
          this.text = text
        }
      },
    })
  })
}

export const probeOf = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __voice: Probe }).__voice)

