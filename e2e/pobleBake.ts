import type { Page } from '@playwright/test'
import { expect, solve } from './helpers'

/** A loose thing of the pile that was laid out for the request (spawned objects have `~` in their uid). */
const pile = (page: Page) => page.locator('[data-uid*="~"]:not([data-in])').first()

const request = async (page: Page): Promise<string> => (await page.getByTestId('errand-request').innerText()).replace(/\s+/g, ' ')

async function dropInto(page: Page, zoneName: RegExp | string, zoneId: string, expected: number, how: 'tap' | 'keyboard'): Promise<void> {
  if (how === 'keyboard') {
    await pile(page).focus()
    await page.keyboard.press('Enter')
    const drop = page.getByRole('button', { name: zoneName })
    await drop.focus()
    await page.keyboard.press('Enter')
  } else {
    await pile(page).dispatchEvent('click')
    await page.getByRole('button', { name: zoneName }).click()
  }
  await expect(page.locator(`[data-zone="${zoneId}"]`)).toHaveAttribute('data-count', String(expected), { timeout: 20_000 })
}

/** Price tags: solve when the text is plain arithmetic, else try the first tag (a wrong one only fades). */
async function answerWithTags(page: Page): Promise<void> {
  const answer = solve(await request(page))
  const tags = page.getByRole('list', { name: 'Etiquetes de preu' })
  if (answer) await tags.getByRole('button', { name: `Resposta ${answer}`, exact: true }).click()
  else await tags.getByRole('button').first().click()
}

/** Plays the bakery request that is open: rows on the tray, sharing onto trays, or price tags. Returns the kind. */
export async function solveBakeRequest(page: Page, how: 'tap' | 'keyboard' = 'tap'): Promise<string> {
  const kind = (await page.locator('[data-errand-kind]').getAttribute('data-errand-kind')) ?? ''
  const text = await request(page)
  if (kind === 'safata') {
    const m = /Vull (\d+) caix\S+ de (\d+)/.exec(text)
    if (!m) throw new Error(`Encàrrec inesperat: ${text}`)
    const total = Number(m[1]) * Number(m[2])
    for (let i = 0; i < total; i++) await dropInto(page, /^Deixa-ho a la safata$/, 'safata', i + 1, how)
    await page.getByRole('button', { name: /Comprova/ }).click()
  } else if (kind === 'reparteix') {
    const m = /Reparteix (\d+) \S+ en (\d+) safates/.exec(text)
    if (!m) throw new Error(`Encàrrec inesperat: ${text}`)
    const groups = Number(m[2])
    const per = Math.floor(Number(m[1]) / groups)
    for (let g = 1; g <= groups; g++) for (let k = 0; k < per; k++) await dropInto(page, new RegExp(`^Deixa-ho a la safata ${g}$`), `safata-${g}`, k + 1, how)
    await page.getByRole('button', { name: /Comprova/ }).click()
  } else await answerWithTags(page)
  return kind
}

/** Plays the pizzeria request that is open when it is sharing onto plates or price tags. 'talla' is left to the caller. */
export async function solvePizzaRequest(page: Page, how: 'tap' | 'keyboard' = 'tap'): Promise<string> {
  const kind = (await page.locator('[data-errand-kind]').getAttribute('data-errand-kind')) ?? ''
  const text = await request(page)
  if (kind === 'plats') {
    const m = /Reparteix (\d+) trossos de pizza en (\d+) plats iguals(?:\. Quants en sobren\?)?/.exec(text)
    if (!m) throw new Error(`Encàrrec inesperat: ${text}`)
    const groups = Number(m[2])
    const total = Number(m[1])
    const per = Math.floor(total / groups)
    for (let g = 1; g <= groups; g++) for (let k = 0; k < per; k++) await dropInto(page, new RegExp(`^Deixa-ho al plat ${g}$`), `plat-${g}`, k + 1, how)
    await page.getByRole('button', { name: /Comprova/ }).click()
  } else if (kind === 'fichas') await answerWithTags(page)
  return kind
}

const bubbleOf = (page: Page) => page.getByRole('button', { name: /toca per atendre/ })

/** How many things the open request moves by hand (0 = it is played with the price tags or cut in three rooms). */
async function handsOn(page: Page): Promise<number> {
  const kind = (await page.locator('[data-errand-kind]').getAttribute('data-errand-kind')) ?? ''
  const text = await request(page)
  if (kind === 'safata') {
    const m = /Vull (\d+) caix\S+ de (\d+)/.exec(text)
    return m ? Number(m[1]) * Number(m[2]) : 0
  }
  if (kind === 'reparteix' || kind === 'plats') {
    const m = /Reparteix (\d+) \S+(?: de pizza)? en (\d+)/.exec(text)
    return m ? Number(m[1]) - (Number(m[1]) % Number(m[2])) : 0
  }
  return 0
}

/**
 * Opens bubbles until one is played with the hands (and is small enough to be quick), says «Ara no» to the others,
 * and plays it. `opened` runs just after the request opens (screenshots). Returns the kind.
 */
export async function playByHand(page: Page, place: 'fleca' | 'pizzeria', how: 'tap' | 'keyboard', opened?: (kind: string) => Promise<void>, max = 14): Promise<string> {
  for (let tries = 0; tries < 30; tries++) {
    await bubbleOf(page).dispatchEvent('click')
    const kind = (await page.locator('[data-errand-kind]').getAttribute('data-errand-kind')) ?? ''
    const n = await handsOn(page)
    if (n === 0 || n > max) {
      await page.getByRole('button', { name: 'Ara no' }).click()
      continue
    }
    await opened?.(kind)
    if (place === 'fleca') await solveBakeRequest(page, how)
    else await solvePizzaRequest(page, how)
    return kind
  }
  throw new Error('Cap encàrrec jugable amb les mans en 30 intents')
}
