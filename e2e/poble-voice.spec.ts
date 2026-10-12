import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { clipKeyFor, normalizeSpeech } from '../src/core/audio/normalize'
import { THANKS } from '../src/world/townVoice'
import { expect } from './helpers'
import { seedBoard, townTest as test } from './pobleWorld'
import { installProbes, probeOf, type Probe } from './voiceKit'

/**
 * The town speaks: when a neighbour asks for something, the request is read with the studio clip (Joana) and not with
 * the device voice. The real manifest and the real MP3 files are used (Chromium decodes them for real); the Perruqueria
 * is the place with the most predictable sentences ("Vull 3 pinces a l’esquerra i 2 a la dreta...").
 */
const MANIFEST = JSON.parse(readFileSync(fileURLToPath(new URL('../public/voice/manifest.json', import.meta.url)), 'utf8')) as { version: 1; voice: string; clips: string[] }
const SYMBOLS = /[+=×÷−<>€%]/
const MAX_NEIGHBOURS = 12

async function enterSalon(page: Page): Promise<void> {
  await page.goto('/#/poble')
  await expect(page.getByTestId('street')).toBeVisible()
  await seedBoard(page, [{ place: 'perruqueria', count: 12, kind: 'repte', neighbour: 'la-nuria' }])
  await page.reload()
  await expect(page.getByTestId('street')).toBeVisible()
  const door = page.getByRole('button', { name: /^Entra a (la )?Perruqueria$/i })
  const width = page.viewportSize()?.width ?? 1024
  for (let i = 0; i < 20; i++) {
    const box = await door.boundingBox()
    const x = box ? box.x + box.width / 2 : -1000
    if (x > 110 && x < width - 110) break
    await page.getByRole('button', { name: x < width / 2 ? 'Camina cap a l’esquerra' : 'Camina cap a la dreta' }).click()
    await page.waitForTimeout(450)
  }
  await door.click()
  await expect(page.getByRole('region', { name: 'La Perruqueria', exact: true })).toBeVisible()
}

const wish = (page: Page) => page.getByRole('button', { name: /toca per atendre/ })

/** Puts one clip from the box on a side of the head: tap it and tap the side. */
async function clipOn(page: Page, zoneId: string): Promise<void> {
  const zone = page.locator(`[data-zone="${zoneId}"]`)
  const before = Number(await zone.getAttribute('data-count'))
  const piece = page.locator('[data-def="pinca"]:not([data-in])').first()
  const drop = page.locator(`[data-zone-drop="${zoneId}"]`)
  await piece.dispatchEvent('click')
  await expect(drop).toBeAttached()
  await drop.dispatchEvent('click')
  await expect(zone).toHaveAttribute('data-count', String(before + 1), { timeout: 15_000 })
}

/** Calls the next neighbour to the counter: the request is shown in the bubble and spoken. */
async function callNeighbour(page: Page): Promise<void> {
  for (let tries = 0; tries < 25; tries++) {
    if (!(await wish(page).isVisible())) {
      await page.clock.fastForward(30_000)
      await expect(wish(page)).toBeVisible({ timeout: 15_000 })
    }
    await wish(page).click({ force: true })
    if (await page.locator('[data-errand-kind]').isVisible()) return
  }
  throw new Error('Cap veí ha arribat al taulell')
}

/** Does the errand the way the child would (clips on her head), so the engine moves on to another request. */
async function serve(page: Page): Promise<void> {
  const request = (await page.getByTestId('errand-request').innerText()).replace(/\s+/g, ' ')
  const pair = /: (\d+) \+ (\d+)\./.exec(request)
  const more = /Ja porto (\d+) \S+ i en vull (\d+)/.exec(request)
  const n = pair ? Number(pair[1]) + Number(pair[2]) : more ? Number(more[2]) - Number(more[1]) : undefined
  if (n === undefined) throw new Error(`No sé resoldre: ${request}`)
  for (let i = 0; i < n; i++) await clipOn(page, i % 2 === 0 ? 'pinces-esq' : 'pinces-dre')
  await page.getByRole('button', { name: 'Ja està!' }).click()
  await page.getByRole('button', { name: 'Adéu!' }).click()
  await expect(page.locator('[data-errand-kind]')).toHaveCount(0)
}

const THANKS_SPOKEN = THANKS.map(normalizeSpeech)

/**
 * What the neighbours' requests sounded like so far, in order: 'clip' or the text the device voice was asked for.
 * The thank-yous are left out (their clips are held back below) and the dev server's double effect is collapsed.
 */
async function requests(page: Page): Promise<Probe['log']> {
  const { log } = await probeOf(page)
  const said = log.filter((e) => !(e.kind === 'device' && e.text !== undefined && THANKS_SPOKEN.includes(e.text)))
  return said.filter((e, i) => !(i > 0 && said[i - 1]?.kind === e.kind && said[i - 1]?.text === e.text && e.at - (said[i - 1]?.at ?? 0) < 400))
}

/** The thank-you clips are served undecodable, so they fall to the device voice and never get mixed up with a request read with a clip. */
async function holdBackThanks(page: Page): Promise<void> {
  const keys = THANKS.map(clipKeyFor).join('|')
  await page.route(new RegExp(`/voice/(${keys})\.mp3$`), (route) => route.fulfill({ body: Buffer.from('not audio'), contentType: 'audio/mpeg' }))
}

test.describe('El poble parla', () => {
  test('la petició d’un veí es llegeix amb el clip i no amb la veu del dispositiu', async ({ page, consoleErrors }) => {
    test.setTimeout(180_000)
    await installProbes(page)
    const clips: string[] = []
    await page.route('**/voice/manifest.json', (route) => route.fulfill({ json: MANIFEST }))
    await holdBackThanks(page)
    page.on('request', (request) => {
      const key = /\/voice\/([0-9a-f]{12})\.mp3$/.exec(request.url())?.[1]
      if (key) clips.push(key)
    })
    await page.clock.install({ time: new Date(2026, 9, 9, 12, 0, 0) })
    await enterSalon(page)

    // The request is spoken when its errand arrives (entering the salon, then after each goodbye). Most sentences of the
    // salon have a clip: the first one read with it proves the whole path (key of the request == key of the manifest,
    // MP3 fetched, decoded and started). A neighbour whose sentence has none is read by the device voice and served.
    let readWithClip = false
    let clipAt = -1
    const readByDevice: string[] = []
    for (let n = 0; n < MAX_NEIGHBOURS && !readWithClip; n++) {
      await expect.poll(async () => (await requests(page)).length, { timeout: 15_000 }).toBeGreaterThan(n)
      const said = (await requests(page))[n]
      if (said?.kind === 'clip') {
        readWithClip = true
        clipAt = n
      } else {
        readByDevice.push(said?.text ?? '')
        await callNeighbour(page)
        await serve(page)
      }
    }

    expect(readWithClip, `cap petició amb clip; la veu del dispositiu ha dit: ${readByDevice.join(' | ')}`).toBe(true)
    expect(clips.length).toBeGreaterThan(0)
    for (const key of clips) expect(MANIFEST.clips).toContain(key)
    // A request read with a clip is not read a second time by the device voice.
    await page.waitForTimeout(800)
    expect(await requests(page)).toHaveLength(clipAt + 1)
    // What the device voice had to say was Catalan with the symbols read as words, never a raw sum.
    for (const text of readByDevice) expect(text).not.toMatch(SYMBOLS)
    expect(consoleErrors).toEqual([])
  })

  test('sense clip per a la frase, el veí parla amb la veu del dispositiu en català i amb els símbols llegits', async ({ page, consoleErrors }) => {
    test.setTimeout(120_000)
    await installProbes(page)
    await page.route('**/voice/manifest.json', (route) => route.fulfill({ json: { version: 1, voice: 'test', clips: [] } }))
    await page.clock.install({ time: new Date(2026, 9, 9, 12, 0, 0) })
    await enterSalon(page)

    await expect.poll(async () => (await probeOf(page)).deviceUtterances.length, { timeout: 15_000 }).toBeGreaterThan(0)
    const probe = await probeOf(page)
    expect(probe.clipStarts).toBe(0)
    const said = probe.deviceUtterances.join(' ')
    expect(said).toMatch(/pinc|Quantes/)
    expect(said).not.toMatch(SYMBOLS)
    expect(consoleErrors).toEqual([])
  })
})
