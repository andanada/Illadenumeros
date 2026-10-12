import { clipKeyFor } from '../src/core/audio/normalize'
import { expect, seededTest as test } from './helpers'
import { installProbes, probeOf, silentWav } from './voiceKit'

/** A1 ("count the objects") always asks this, so the clip key is known in advance. */
const SPOKEN = 'Quants n’hi ha?'
const KEY = clipKeyFor(SPOKEN)

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
