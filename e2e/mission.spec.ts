import { CHILD, expect, seededTest as test, SCORE_RE } from './helpers'

test.describe('Missió d’avui', () => {
  test('mostra les 4 etapes i el primer joc comença', async ({ page, consoleErrors }) => {
    await page.goto('/#/mission')

    await expect(page.getByRole('heading', { level: 1, name: 'Missió d’avui' })).toBeVisible()
    await expect(page.getByText(`Hola, ${CHILD.name}! Són 4 jocs ràpids.`)).toBeVisible()

    const strip = page.getByRole('list', { name: 'Missió: 0 de 4 fets' })
    await expect(strip).toBeVisible()
    await expect(strip.getByRole('listitem')).toHaveCount(4)
    await expect(strip.getByRole('listitem').first()).toContainText('Calentament')
    expect(await page.locator('body').innerText()).not.toMatch(SCORE_RE)

    await page.getByRole('button', { name: /^Som-hi: calentament$/ }).click()

    // Step 1 is the Duel Llampec warm-up.
    await expect(page.getByRole('heading', { level: 1, name: 'Duel Llampec' })).toBeVisible()
    await expect(page.getByTestId('duel-question')).toBeVisible()
    await expect(page.getByRole('group', { name: 'Respostes' }).getByRole('button').first()).toBeEnabled()
    await expect(page).toHaveURL(/#\/mission$/)
    expect(consoleErrors).toEqual([])
  })

  test('el botó Enrere de la missió torna al poble', async ({ page }) => {
    await page.goto('/#/mission')
    await expect(page.getByRole('list', { name: /^Missió: 0 de 4 fets$/ })).toBeVisible()
    await page.getByRole('button', { name: 'Enrere' }).click()
    await expect(page).toHaveURL(/#\/poble$/)
  })
})
