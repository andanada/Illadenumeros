import type { Locator, Page } from '@playwright/test'
import { expect, solve } from './helpers'
import { carry } from './pobleWorld'

const norm = (text: string): string => text.replace(/\s+/g, ' ').trim()

/** The farm's own extra items: squares, cubes and the hidden number of × and :. */
export function solveExtra(raw: string): string | undefined {
  const text = norm(raw)
  let m = /^(\d+)² = \?$/.exec(text)
  if (m) return String(Number(m[1]) ** 2)
  m = /^(\d+)³ = \?$/.exec(text)
  if (m) return String(Number(m[1]) ** 3)
  m = /^(\d+) × \? = (\d+)$/.exec(text)
  if (m) return String(Number(m[2]) / Number(m[1]))
  m = /^\? : (\d+) = (\d+)$/.exec(text)
  if (m) return String(Number(m[1]) * Number(m[2]))
  return solve(text)
}

export const requestText = async (page: Page): Promise<string> => norm((await page.getByTestId('errand-request').textContent()) ?? '')

/** Gives every price-tag item the right tag when the text can be solved, else any tag (the flow is what counts). */
export async function answerWithTags(page: Page, text: string, answer: string | undefined): Promise<void> {
  const tags: Locator = page.getByRole('list', { name: 'Etiquetes de preu' })
  const right = answer === undefined ? undefined : tags.getByRole('button', { name: `Resposta ${answer}`, exact: true })
  if (right && (await right.count()) > 0) await right.click()
  else await tags.getByRole('button').first().click()
  void text
}

/** Plays whatever the farmer asks, in the world (seeds, bowls, egg boxes) or with the tags. Returns the kind played. */
export async function solveFarmRequest(page: Page): Promise<string> {
  const region = page.getByRole('region', { name: /^Encàrrec a la Granja/ })
  await expect(region).toBeVisible()
  const kind = (await region.getAttribute('data-errand-kind')) ?? ''
  const text = await requestText(page)
  if (kind === 'parcel') {
    const m = /Vull (\d+) fil\w+ de (\d+) llavor/.exec(text)
    if (!m) throw new Error(`Encàrrec inesperat: ${text}`)
    for (let i = 0; i < Number(m[1]) * Number(m[2]); i++) await carry(page, 'llavor-peticio', 'Deixa-ho a la parcel·la')
    await page.getByRole('button', { name: 'Comprova' }).click()
  } else if (kind === 'repartir') {
    const eggs = /Tinc (\d+) ous\. Posa’ls en caixes de (\d+)/.exec(text)
    if (eggs) {
      const full = Math.floor(Number(eggs[1]) / Number(eggs[2]))
      const cartons = page.locator('[data-zone^="bol-"]')
      for (let c = 0; c < full; c++) {
        const name = (await cartons.nth(c).getAttribute('aria-label')) ?? ''
        for (let i = 0; i < Number(eggs[2]); i++) await carry(page, 'ou-peticio', `Deixa-ho a ${name}`)
      }
    } else {
      const m = /Reparteix (\d+) cubs de gra entre (\d+) animals/.exec(text)
      if (!m) throw new Error(`Encàrrec inesperat: ${text}`)
      const each = Math.floor(Number(m[1]) / Number(m[2]))
      const bowls = page.locator('[data-zone^="bol-"]')
      for (let b = 0; b < Number(m[2]); b++) {
        const name = (await bowls.nth(b).getAttribute('aria-label')) ?? ''
        for (let i = 0; i < each; i++) await carry(page, 'gra', `Deixa-ho al ${name.replace(/^el /, '')}`)
      }
    }
    await page.getByRole('button', { name: 'Comprova' }).click()
  } else {
    await answerWithTags(page, text, solveExtra(text))
  }
  return kind
}

const cents = (euros: string, rest: string): number => Number(euros) * 100 + Number(rest.padEnd(2, '0'))
const PIECES_DESC = [2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const

/** The cents the cashier tray must hold for a discount sentence (the new price, or the shopper's change). */
function discountTarget(text: string): number {
  const m = /costa (\d+),(\d+) €.*?descompte del (\d+) ?%/.exec(text)
  if (!m || !m[1] || !m[2] || !m[3]) throw new Error(`Encàrrec inesperat: ${text}`)
  const now = (cents(m[1], m[2]) * (100 - Number(m[3]))) / 100
  const paid = /paga amb (\d+),(\d+) €/.exec(text)
  return paid && paid[1] && paid[2] ? cents(paid[1], paid[2]) - now : now
}

/** Cents asked by a sum / difference of two prices, or by a discount. */
function trayTarget(text: string): number {
  const sum = /val (\d+),(\d+) € i aquesta (\d+),(\d+) €/.exec(text)
  if (sum && sum[1] && sum[2] && sum[3] && sum[4]) return cents(sum[1], sum[2]) + cents(sum[3], sum[4])
  const diff = /Tinc (\d+),(\d+) € i compro una cosa de (\d+),(\d+) €/.exec(text)
  if (diff && diff[1] && diff[2] && diff[3] && diff[4]) return cents(diff[1], diff[2]) - cents(diff[3], diff[4])
  return discountTarget(text)
}

/** Plays whatever the market asks: bags on the big scale, coins on the tray, or the sheet's price tags. Returns the kind. */
export async function solveMarketRequest(page: Page): Promise<string> {
  const region = page.getByRole('region', { name: /^Encàrrec a el Mercat/ })
  await expect(region).toBeVisible()
  const kind = (await region.getAttribute('data-errand-kind')) ?? ''
  const text = await requestText(page)
  if (kind === 'bascula') {
    const m = /Vull (\d+),(\d) kg/.exec(text)
    if (!m) throw new Error(`Encàrrec inesperat: ${text}`)
    for (let i = 0; i < Number(m[1]) * 10 + Number(m[2]); i++) await carry(page, 'bossa', 'Deixa-ho a la bàscula gran')
    await page.getByRole('button', { name: 'Comprova' }).click()
  } else if (kind === 'safata') {
    let left = trayTarget(text)
    for (const piece of PIECES_DESC) {
      while (left >= piece) {
        await carry(page, `peca-${piece}`, 'Deixa-ho a la safata de la caixa')
        left -= piece
      }
    }
    await page.getByRole('button', { name: 'Cobra' }).click()
  } else {
    await answerWithTags(page, text, solveExtra(text))
  }
  return kind
}
