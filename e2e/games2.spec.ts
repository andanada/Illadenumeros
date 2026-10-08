import type { Locator, Page } from '@playwright/test'
import { answerButton, expect, feedbackStatus, hasHorizontalScroll, NEGATIVE_RE, seededTest as test, solve } from './helpers'

const NEXT = /^(Següent →|Acabar ✨)$/

/** Opens a game in free play; `rounds` makes it end by itself so the end screen can be reached. */
async function openGame(page: Page, gameId: string, title: string, skills: string, rounds: number): Promise<void> {
  await page.goto(`/#/play/${gameId}?skills=${skills}&rounds=${rounds}`)
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
}

async function expectEndScreen(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Tornar a jugar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tornar al mapa' })).toBeVisible()
  expect(await hasHorizontalScroll(page)).toBe(false)
}

/** Missing number of `? + 3 = 8`, `4 × ? = 28`, `36 : ? = 9`, `? : 4 = 9`, `9 − ? = 4`. */
function missingNumber(text: string): string {
  const m = /^(\d+|\?) ([+×:−-]) (\d+|\?) = (\d+)$/.exec(text.replace(/\s+/g, ' ').trim())
  if (!m) throw new Error(`Equació no reconeguda: "${text}"`)
  const [a, op, b, result] = [m[1] as string, m[2] as string, m[3] as string, Number(m[4])]
  const known = Number(a === '?' ? b : a)
  const first = a === '?'
  switch (op) {
    case '+':
      return String(result - known)
    case '×':
      return String(result / known)
    case ':':
      return String(first ? result * known : known / result)
    default:
      return String(first ? result + known : known - result)
  }
}

test.describe('El Número Amagat', () => {
  test('una balança que s’equilibra amb el pes correcte, fins a la pantalla final', async ({ page, consoleErrors }) => {
    await openGame(page, 'numero-amagat', 'El Número Amagat', 'A10', 2)
    const scale = page.getByRole('img', { name: /^La balança/ })

    for (let round = 1; round <= 2; round++) {
      await expect(scale).toBeVisible()
      const text = await page.getByTestId('question-text').innerText()
      const value = missingNumber(text)
      await expect(scale).toHaveAccessibleName(/pesa més a la dreta|pesa més a l’esquerra/)
      expect(await hasHorizontalScroll(page)).toBe(false)

      if (round === 1) {
        // A wrong weight tips the scale, gets a kind hint and goes back to the tray.
        const wrong = page.getByRole('group', { name: 'Respostes' }).getByRole('button').filter({ hasNotText: new RegExp(`^${value}$`) }).first()
        await wrong.click()
        await expect(feedbackStatus(page)).toHaveText(/^Gairebé!/)
        await expect(feedbackStatus(page)).not.toHaveText(NEGATIVE_RE)
        await expect(wrong).toBeDisabled()
        await expect(page.getByTestId('hidden-slot')).toHaveText('?', { timeout: 5_000 })
      }

      await answerButton(page, value).click()
      await expect(scale).toHaveAccessibleName(/en equilibri/)
      await expect(feedbackStatus(page)).toHaveText(/^Molt bé!/)
      await page.getByRole('button', { name: NEXT }).click()
    }

    await expectEndScreen(page)
    expect(consoleErrors).toEqual([])
  })

  test('el pes també es pot arrossegar fins a la balança', async ({ page, consoleErrors }) => {
    await openGame(page, 'numero-amagat', 'El Número Amagat', 'A10', 3)
    const value = missingNumber(await page.getByTestId('question-text').innerText())
    const from = await answerButton(page, value).boundingBox()
    const to = await page.getByTestId('hidden-slot').boundingBox()
    if (!from || !to) throw new Error('Falta el pes o el forat de la balança')
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 })
    await page.mouse.up()
    await expect(page.getByRole('img', { name: /^La balança/ })).toHaveAccessibleName(/en equilibri/)
    expect(consoleErrors).toEqual([])
  })

  test('les tecles funcionen: Enter posa el pes seleccionat', async ({ page, consoleErrors }) => {
    await openGame(page, 'numero-amagat', 'El Número Amagat', 'D9', 3)
    const value = missingNumber(await page.getByTestId('question-text').innerText())
    await answerButton(page, value).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('img', { name: /^La balança/ })).toHaveAccessibleName(/en equilibri/)
    expect(consoleErrors).toEqual([])
  })
})

/** Parses the cake's accessible name: "Un pastís tallat en 4 trossos iguals, amb 3 pintats". */
async function cakeFraction(cake: Locator): Promise<{ parts: number; painted: number }> {
  const label = (await cake.getAttribute('aria-label')) ?? ''
  const m = /en (\d+) trossos iguals, amb (\d+) pintats/.exec(label)
  if (!m) throw new Error(`Pastís no reconegut: "${label}"`)
  return { parts: Number(m[1]), painted: Number(m[2]) }
}

const GLYPHS: Record<string, [number, number]> = { '½': [1, 2], '⅓': [1, 3], '¼': [1, 4], '¾': [3, 4] }

test.describe('Pastís de Fraccions', () => {
  test('talla, reparteix i respon fins a la pantalla final', async ({ page, consoleErrors }) => {
    await openGame(page, 'pastis-fraccions', 'Pastís de Fraccions', 'C8', 3)

    for (let round = 1; round <= 3; round++) {
      const text = await page.getByTestId('question-text').innerText()
      const deal = page.getByRole('button', { name: 'Reparteix' })
      const cake = page.getByRole('group', { name: /^Un pastís tallat en \d+ trossos/ })
      await expect(deal.or(cake).first()).toBeVisible()
      expect(await hasHorizontalScroll(page)).toBe(false)

      if (await deal.isVisible()) {
        const m = /^Quant és (\S) de (\d+)\?$/.exec(text)
        expect(m, `Pregunta no reconeguda: "${text}"`).not.toBeNull()
        const [selected, parts] = GLYPHS[m?.[1] ?? ''] ?? [0, 1]
        const total = Number(m?.[2])
        expect(page.getByRole('group', { name: 'Respostes' })).toHaveCount(0)
        await deal.click()
        for (let g = 1; g <= selected; g++) await page.getByRole('button', { name: new RegExp(`^Grup ${g}:`) }).click()
        await expect(page.getByRole('group', { name: 'Respostes' })).toBeVisible()
        await answerButton(page, String((total / parts) * selected)).click()
      } else {
        const { parts, painted } = await cakeFraction(cake)
        await page.getByRole('button', { name: /^Tros 1 de \d+, pintat$/ }).click()
        await expect(page.getByText(`1 de ${parts} trossos`)).toBeVisible()
        await page.getByRole('group', { name: 'Respostes' }).getByRole('button', { name: `Resposta ${painted}/${parts}` }).click()
      }
      await expect(feedbackStatus(page)).toHaveText(/^Molt bé!/)
      await page.getByRole('button', { name: NEXT }).click()
    }

    await expectEndScreen(page)
    expect(consoleErrors).toEqual([])
  })

  test('fraccions equivalents: més trossos, mateixa part', async ({ page, consoleErrors }) => {
    await openGame(page, 'pastis-fraccions', 'Pastís de Fraccions', 'E9', 2)
    const cake = page.getByRole('img', { name: /^Un pastís tallat en \d+ trossos/ })
    const more = page.getByRole('button', { name: 'Més trossos' })
    await expect(cake.or(page.getByRole('group', { name: 'Respostes' })).first()).toBeVisible()
    if (await more.isVisible()) {
      const before = await cakeFraction(cake)
      if (await more.isEnabled()) {
        await more.click()
        const after = await cakeFraction(cake)
        expect(after.painted * before.parts).toBe(before.painted * after.parts)
        expect(after.parts).toBeGreaterThan(before.parts)
      }
    }
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })
})

/** Answers whatever the maze asks: solves what it can read, otherwise taps bubbles until the help gives the way. */
async function answerJunction(page: Page): Promise<void> {
  const question = page.getByTestId('question-text')
  await expect(question).toBeVisible()
  const value = solve(await question.innerText())
  const answers = page.getByRole('group', { name: 'Respostes' })
  if (value !== undefined) {
    await answerButton(answers, value).click()
    return
  }
  const solved = page.getByText('Molt bé! ✨')
  const keepGoing = page.getByRole('button', { name: 'Continua' })
  for (let i = 0; i < 4; i++) {
    if ((await solved.isVisible()) || (await keepGoing.isVisible())) break
    await answers.getByRole('button').and(page.locator(':enabled')).first().click()
  }
  if (await keepGoing.isVisible()) await keepGoing.click()
}

test.describe('Laberint de l’Aventura', () => {
  test('quatre encreuaments, el cofre amb pegatina i la pantalla final', async ({ page, consoleErrors }) => {
    // With reduced motion the chest and the explorer stand still, which is also what a child who asked for it gets.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openGame(page, 'laberint-aventura', 'Laberint de l’Aventura', 'A4,A5,A6', 4)
    const chest = page.getByRole('button', { name: 'Obrir el cofre' })

    for (let junction = 0; junction < 4; junction++) {
      await expect(page.getByRole('img', { name: new RegExp(`has passat ${junction} encreuaments de 4`) })).toBeVisible({ timeout: 15_000 })
      expect(await hasHorizontalScroll(page)).toBe(false)
      await answerJunction(page)
    }

    await expect(chest).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('img', { name: /has arribat al cofre/ })).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
    await chest.click()
    await expect(page.getByRole('img', { name: /^Pegatina nova: / })).toBeVisible()
    await page.getByRole('button', { name: 'Continua' }).click()

    await expectEndScreen(page)
    expect(consoleErrors).toEqual([])
  })

  test('el mapa mostra la porta del laberint a cada regió', async ({ page, consoleErrors }) => {
    await page.goto('/#/map')
    await expect(page.getByText(/Laberint de l’Aventura/).first()).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })
})
