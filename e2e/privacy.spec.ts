import { createProfile, expect, hasHorizontalScroll, test } from './helpers'

test.describe('Privacitat', () => {
  test('el peu de la pàgina d’inici porta a /privacitat i es pot tornar', async ({ page, consoleErrors }) => {
    await page.goto('/#/start')
    await page.getByRole('link', { name: 'Privacitat' }).click()
    await expect(page).toHaveURL(/#\/privacitat$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Privacitat' })).toBeVisible()

    for (const name of ['Quines dades es guarden', 'Què no fem', 'Quant de temps es guarden', 'Exportar i esborrar les dades', 'Les dades dels infants', 'Com es protegeixen', 'Com contactar-nos']) {
      await expect(page.getByRole('region', { name })).toBeVisible()
    }
    await expect(page.getByRole('region', { name: 'Exportar i esborrar les dades' })).toContainText('/api/account/export')

    // The default build still carries the placeholder, so the owner notice is visible.
    await expect(page.getByRole('note')).toContainText('encara no està configurada')
    await expect(page.getByRole('link', { name: 'contacte@exemple.cat' })).toHaveAttribute('href', 'mailto:contacte@exemple.cat')

    expect(await hasHorizontalScroll(page)).toBe(false)

    await page.getByRole('button', { name: 'Enrere' }).click()
    await expect(page).toHaveURL(/#\/start$/)
    expect(consoleErrors).toEqual([])
  })

  test('és accessible sense perfil i amb perfil, sense peticions externes', async ({ page, baseURL, consoleErrors }) => {
    const external: string[] = []
    const origin = new URL(baseURL ?? '').origin
    page.on('request', (request) => {
      if (request.url().startsWith('http') && !request.url().startsWith(origin)) external.push(request.url())
    })

    await page.goto('/#/privacitat')
    await expect(page.getByRole('heading', { level: 1, name: 'Privacitat' })).toBeVisible()

    await createProfile(page)
    await page.goto('/#/privacitat')
    await expect(page.getByRole('heading', { level: 1, name: 'Privacitat' })).toBeVisible()
    await page.getByRole('button', { name: 'Enrere' }).click()
    await expect(page).toHaveURL(/#\/(poble|diagnostic)$/)

    expect(external).toEqual([])
    expect(consoleErrors).toEqual([])
  })
})
