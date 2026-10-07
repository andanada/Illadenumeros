import { CHILD, completeDiagnostic, createProfile, expect, test, themeOf } from './helpers'

test.describe('Primera vegada', () => {
  test('/ porta a #/start i l’onboarding acaba al diagnòstic amb el tema triat', async ({ page, consoleErrors }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/#\/start$/)
    await expect(page.getByRole('heading', { name: 'Mates Màgiques' })).toBeVisible()

    await page.getByRole('button', { name: 'Toca per començar' }).click()
    await expect(page).toHaveURL(/#\/onboarding$/)
    await expect(page.getByRole('img', { name: 'Pas 1 de 4' })).toBeVisible()

    // An empty name is refused with a friendly message, not an error.
    await page.getByRole('button', { name: 'Continua' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Escriu el teu nom' })).toBeVisible()

    await page.getByLabel('Com et dius?').fill(`  ${CHILD.name}  `)
    await page.getByRole('button', { name: 'Continua' }).click()
    await expect(page.getByRole('img', { name: 'Pas 2 de 4' })).toBeVisible()

    // "Continua" stays disabled until a character is picked.
    await expect(page.getByRole('button', { name: 'Continua' })).toBeDisabled()
    const characters = page.getByRole('radiogroup', { name: 'Personatge preferit' })
    await characters.getByRole('radio', { name: CHILD.character }).click()
    await expect(characters.getByRole('radio', { name: CHILD.character })).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('button', { name: 'Continua' }).click()

    const colors = page.getByRole('radiogroup', { name: 'Color preferit' })
    await expect(colors.getByRole('radio', { name: 'Lila' })).toHaveAttribute('aria-checked', 'true')
    const before = await themeOf(page)
    await colors.getByRole('radio', { name: CHILD.color }).click()
    await expect.poll(() => themeOf(page)).toBe(CHILD.theme)
    expect(before).not.toBe(CHILD.theme)
    await page.getByRole('button', { name: 'Continua' }).click()

    await expect(page.getByRole('img', { name: 'Pas 4 de 4' })).toBeVisible()
    await expect(page.getByText(CHILD.name).first()).toBeVisible()
    await page.getByRole('button', { name: 'Som-hi!' }).click()

    await expect(page).toHaveURL(/#\/diagnostic$/)
    await expect(page.getByRole('heading', { name: 'L’Expedició del Mapa' })).toBeVisible()
    await expect.poll(() => themeOf(page)).toBe(CHILD.theme)
    expect(consoleErrors).toEqual([])
  })
})

test.describe('Diagnòstic i persistència', () => {
  test('el diagnòstic arriba al mapa sense mostrar mai cap puntuació', async ({ page, consoleErrors }) => {
    await createProfile(page)
    const run = await completeDiagnostic(page)

    expect(run.questions.length).toBeGreaterThanOrEqual(3)
    expect(run.scoreLeaks, `Text de puntuació visible: ${run.scoreLeaks.join(', ')}`).toEqual([])
    await expect(page).toHaveURL(/#\/map$/)
    await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    expect(consoleErrors).toEqual([])
  })

  test('després de recarregar continua al mapa amb el perfil i les estrelles', async ({ page }) => {
    await createProfile(page)
    await completeDiagnostic(page)

    await page.reload()
    await expect(page).toHaveURL(/#\/map$/)
    await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    await expect.poll(() => themeOf(page)).toBe(CHILD.theme)

    const stops = page.getByRole('button', { name: /de 3 estrelles$/ })
    await expect(stops.first()).toBeVisible()
    // The diagnostic placed the child above the first skills, so some stops already carry stars.
    await expect(page.getByRole('button', { name: /: [123] de 3 estrelles$/ }).first()).toBeVisible()

    // Opening "/" again resolves home to the map, not to the start screen.
    await page.goto('/')
    await expect(page).toHaveURL(/#\/map$/)
  })
})
