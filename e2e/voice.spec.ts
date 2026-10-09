import type { Page } from '@playwright/test'
import { clipKeyFor } from '../src/core/audio/normalize'
import { expect, seededTest as test } from './helpers'

/** A1 ("count the objects") always asks this, so the clip key is known in advance. */
const SPOKEN = 'Quants n’hi ha?'
const KEY = clipKeyFor(SPOKEN)

/** 0.2 s of 16-bit mono silence as a WAV: decodeAudioData sniffs the content, so it stands in for a tiny MP3. */
function silentWav(): Buffer {
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

interface Probe {
  clipStarts: number
  deviceUtterances: string[]
}

async function installProbes(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: Probe = { clipStarts: 0, deviceUtterances: [] }
    ;(window as unknown as { __voice: Probe }).__voice = probe
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      probe.clipStarts += 1
      return start.apply(this, args)
    }
    // A Catalan device voice that records what it is asked to say, so the fallback is observable.
    const voice = { lang: 'ca-ES', name: 'Test', default: true, localService: true, voiceURI: 'test' }
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [voice],
        // Like a real browser, cancel() drops what is queued: React StrictMode speaks twice in dev, one is audible.
        speak: (utterance: { text: string }) => probe.deviceUtterances.push(utterance.text),
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

const probeOf = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __voice: Probe }).__voice)

async function openFirstQuestion(page: Page): Promise<void> {
  await page.goto('/#/poble')
  // Any tap counts as the user gesture the browser needs before audio may start.
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.evaluate(() => {
    window.location.hash = '#/play/repte-illa?skills=A1'
  })
  await expect(page.getByTestId('question-text')).toBeVisible()
}

test.describe('Veu pregravada', () => {
  test('una pregunta es llegeix amb el clip i no amb la veu del dispositiu', async ({ page, consoleErrors }) => {
    await installProbes(page)
    const hits = { manifest: 0, clip: 0 }
    await page.route('**/voice/manifest.json', async (route) => {
      hits.manifest += 1
      await route.fulfill({ json: { version: 1, voice: 'test', clips: [KEY] } })
    })
    await page.route(`**/voice/${KEY}.mp3`, async (route) => {
      hits.clip += 1
      await route.fulfill({ body: silentWav(), contentType: 'audio/mpeg' })
    })

    await openFirstQuestion(page)

    await expect.poll(async () => (await probeOf(page)).clipStarts).toBeGreaterThan(0)
    expect(hits.clip).toBeGreaterThan(0)
    expect(hits.manifest).toBe(1)
    expect((await probeOf(page)).deviceUtterances).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('sense clip per a la frase, parla la veu del dispositiu', async ({ page, consoleErrors }) => {
    await installProbes(page)
    await page.route('**/voice/manifest.json', (route) => route.fulfill({ json: { version: 1, voice: 'test', clips: [] } }))

    await openFirstQuestion(page)

    await expect.poll(async () => (await probeOf(page)).deviceUtterances).toEqual([SPOKEN])
    expect((await probeOf(page)).clipStarts).toBe(0)
    expect(consoleErrors).toEqual([])
  })

  test('un manifest malformat no trenca l’app: cau a la veu del dispositiu', async ({ page, consoleErrors }) => {
    await installProbes(page)
    await page.route('**/voice/manifest.json', (route) => route.fulfill({ json: { version: 99 } }))

    await openFirstQuestion(page)

    await expect.poll(async () => (await probeOf(page)).deviceUtterances).toEqual([SPOKEN])
    expect(consoleErrors).toEqual([])
  })

  test('silenciar atura el clip i no en comença de nous', async ({ page }) => {
    await installProbes(page)
    await page.route('**/voice/manifest.json', (route) => route.fulfill({ json: { version: 1, voice: 'test', clips: [KEY] } }))
    await page.route(`**/voice/${KEY}.mp3`, (route) => route.fulfill({ body: silentWav(), contentType: 'audio/mpeg' }))
    await page.addInitScript(() => localStorage.setItem('mm-muted', '1'))

    await openFirstQuestion(page)
    await page.getByRole('button', { name: 'Escoltar la pregunta' }).click()

    expect((await probeOf(page)).clipStarts).toBe(0)
    expect((await probeOf(page)).deviceUtterances).toEqual([])
  })
})
