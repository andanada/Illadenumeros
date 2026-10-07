import { expect, hasHorizontalScroll, passAdultCheck, seededTest as test } from './helpers'

const SECTIONS = ['Resum', 'Recomanacions', 'Mapa d’habilitats', 'Mapa de fets', 'Temps i constància', 'Evolució', 'Errors més freqüents']

test.describe('Progrés (adults)', () => {
  test('demana la comprovació d’adult i mostra totes les seccions sense desbordar', async ({ page, consoleErrors }) => {
    await page.goto('/#/progres')
    await passAdultCheck(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Progrés' })).toBeVisible()
    for (const name of SECTIONS) await expect(page.getByRole('region', { name })).toBeVisible()
    await expect(page.getByText(/Ara treballa continguts de/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Imprimeix / desa en PDF' })).toBeVisible()
    await expect(page.locator('body')).not.toContainText(/NaN|Infinity/)
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })

  test('el mapa de fets es pot recórrer amb el teclat i canvia de mode', async ({ page }) => {
    await page.goto('/#/progres')
    await passAdultCheck(page)
    const grid = page.getByRole('grid', { name: 'Taula de multiplicar (1 a 10)' })
    await grid.scrollIntoViewIfNeeded()
    await grid.getByRole('gridcell').first().focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await expect(grid.getByRole('gridcell', { name: /^2 × 2/ })).toBeFocused()
    await page.getByRole('button', { name: 'Fluïdesa' }).click()
    await expect(page.getByRole('button', { name: 'Fluïdesa' })).toHaveAttribute('aria-pressed', 'true')
    expect(await hasHorizontalScroll(page)).toBe(false)
  })

  test('un cop de dit en una habilitat en mostra el detall', async ({ page }) => {
    await page.goto('/#/progres')
    await passAdultCheck(page)
    await page.getByRole('button', { name: /^A4,/ }).click()
    await expect(page.getByText(/^A4 · /)).toBeVisible()
  })
})
