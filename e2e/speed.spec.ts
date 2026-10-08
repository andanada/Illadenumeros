import type { Page } from '@playwright/test'
import { expect, hasHorizontalScroll, NEGATIVE_RE, seededTest as test, solve } from './helpers'

const MAX_QUESTIONS = 40

async function openGame(page: Page, gameId: string, title: string): Promise<void> {
  await page.goto(`/#/play/${gameId}`)
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
  await expect(page.getByTestId('speed-question')).toBeVisible()
}

/** Plays with the keyboard only (typing the number) until the end-of-round summary shows. Returns the questions seen. */
async function playByKeyboard(page: Page): Promise<string[]> {
  const summary = page.getByTestId('speed-summary')
  const question = page.getByTestId('speed-question')
  const seen: string[] = []
  for (let i = 0; i < MAX_QUESTIONS; i++) {
    if (await summary.isVisible()) break
    const text = ((await question.textContent({ timeout: 2000 }).catch(() => null)) ?? '').trim()
    const answer = solve(text)
    if (answer === undefined) {
      // The question changes between reads (next sum loading) or the summary just opened: look again.
      await page.waitForTimeout(150)
      continue
    }
    seen.push(text)
    await page.keyboard.type(answer)
    // The next sum (or the summary) replaces this one.
    await expect(summary.or(question.filter({ hasNotText: text }))).toBeVisible({ timeout: 8000 })
  }
  await expect(summary).toBeVisible()
  return seen
}

async function expectKindAndFitting(page: Page): Promise<void> {
  expect(await hasHorizontalScroll(page)).toBe(false)
  const body = await page.locator('body').innerText()
  expect(body).not.toMatch(NEGATIVE_RE)
}

async function expectBigTargets(page: Page): Promise<void> {
  // The answer stickers pop in with a short spring: measure them once settled.
  await page.waitForTimeout(900)
  const pause = await page.getByRole('button', { name: 'Pausa' }).boundingBox()
  expect(pause?.height ?? 0).toBeGreaterThanOrEqual(64)
  const answers = page.getByRole('group', { name: 'Respostes' }).getByRole('button')
  const count = await answers.count()
  expect(count).toBeGreaterThanOrEqual(3)
  for (let i = 0; i < count; i++) {
    const box = await answers.nth(i).boundingBox()
    // Fish swim, so a box can be partly outside the pond; its size is what matters.
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(64)
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(64)
  }
}

test.describe('Jocs de velocitat', () => {
  test('Tren de Sumes: ronda completa amb el teclat fins al resum', async ({ page, consoleErrors }) => {
    await openGame(page, 'tren-sumes', 'Tren de Sumes')
    await expect(page.getByTestId('pace-bar')).toBeVisible()
    await expectBigTargets(page)
    await expectKindAndFitting(page)

    const seen = await playByKeyboard(page)
    expect(seen.length).toBeGreaterThanOrEqual(8)
    const summary = page.getByTestId('speed-summary')
    await expect(summary).toContainText('El tren ha arribat a l’estació!')
    await expect(summary.getByRole('status')).not.toBeEmpty()
    await expectKindAndFitting(page)

    await summary.getByRole('button', { name: 'Continua' }).click()
    await expect(page.getByRole('button', { name: 'Tornar a jugar' })).toBeVisible()
    expect(consoleErrors).toEqual([])
  })

  test('Tren de Sumes: la pausa tapa la pregunta i es pot continuar', async ({ page, consoleErrors }) => {
    await openGame(page, 'tren-sumes', 'Tren de Sumes')
    const before = (await page.getByTestId('speed-question').textContent())?.trim()
    await page.getByRole('button', { name: 'Pausa' }).click()
    await expect(page.getByRole('dialog', { name: 'Pausa' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByTestId('speed-question')).toHaveText(before ?? '')
    expect(consoleErrors).toEqual([])
  })

  test('Pesca de Sumes: ronda completa amb el teclat mentre els peixos neden', async ({ page, consoleErrors }) => {
    await openGame(page, 'pesca-sumes', 'Pesca de Sumes')
    await expect(page.getByTestId('pond')).toHaveAttribute('data-mode', 'moving')
    await expectBigTargets(page)
    await expectKindAndFitting(page)

    const seen = await playByKeyboard(page)
    expect(seen.length).toBeGreaterThanOrEqual(8)
    await expect(page.getByTestId('speed-summary')).toContainText('Quina bona pesca!')
    await expectKindAndFitting(page)
    await page.getByRole('button', { name: 'Continua' }).click()
    await expect(page.getByRole('button', { name: 'Tornar a jugar' })).toBeVisible()
    expect(consoleErrors).toEqual([])
  })

  test('Pesca de Sumes: amb moviment reduït els peixos es queden quiets i es pot tocar', async ({ page, consoleErrors }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openGame(page, 'pesca-sumes', 'Pesca de Sumes')
    const pond = page.getByTestId('pond')
    await expect(pond).toHaveAttribute('data-mode', 'calm')
    const fishBox = await pond.getByRole('button').first().boundingBox()
    await page.waitForTimeout(600)
    expect(await pond.getByRole('button').first().boundingBox()).toEqual(fishBox)

    const text = ((await page.getByTestId('speed-question').textContent()) ?? '').trim()
    const answer = solve(text)
    expect(answer, `Suma no reconeguda: ${text}`).toBeDefined()
    await pond.getByRole('button', { name: `Resposta ${answer}` }).click()
    await expect(page.getByTestId('speed-question')).not.toHaveText(text, { timeout: 8000 })
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })
})
