import { CHILD, completeDiagnostic, createProfile, expect, test, themeOf } from './helpers'

test.describe('Primera vegada', () => {
  test('/ porta a #/start i el primer dia acaba als primers encàrrecs amb el tema triat', async ({ page, consoleErrors }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/#\/start$/)
    await expect(page.getByRole('heading', { name: 'Mates Màgiques' })).toBeVisible()

    await page.getByRole('button', { name: 'Toca per començar' }).click()
    await expect(page).toHaveURL(/#\/onboarding$/)
    await expect(page.getByRole('img', { name: 'Pas 1 de 3' })).toBeVisible()

    // An empty name is refused with a friendly message, not an error.
    await page.getByRole('button', { name: 'Continua' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Escriu el teu nom' })).toBeVisible()

    await page.getByLabel('Com et dius?').fill(`  ${CHILD.name}  `)
    await page.getByRole('button', { name: 'Continua' }).click()

    // Step 2: she makes her character.
    const creator = page.getByRole('region', { name: 'Crea el teu personatge' })
    await expect(creator).toBeVisible()
    const before = await themeOf(page)
    await creator.getByRole('tab', { name: 'Roba de dalt' }).click()
    await creator.getByRole('radio', { name: CHILD.color, exact: true }).click()
    await expect.poll(() => themeOf(page)).toBe(CHILD.theme)
    expect(before).not.toBe(CHILD.theme)
    await creator.getByRole('button', { name: 'Fet!' }).click()

    await expect(page.getByRole('img', { name: 'Pas 3 de 3' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Benvinguda al poble!' })).toBeVisible()
    await expect(page.getByText(CHILD.name).first()).toBeVisible()
    await page.getByRole('button', { name: 'Som-hi!' }).click()

    await expect(page).toHaveURL(/#\/diagnostic$/)
    await expect(page.getByRole('heading', { name: 'Els primers encàrrecs' })).toBeVisible()
    await expect.poll(() => themeOf(page)).toBe(CHILD.theme)
    expect(consoleErrors).toEqual([])
  })
})

test.describe('Diagnòstic i persistència', () => {
  test('els primers encàrrecs porten al carrer sense mostrar mai cap puntuació', async ({ page, consoleErrors }) => {
    await createProfile(page)
    const run = await completeDiagnostic(page)

    expect(run.questions.length).toBeGreaterThanOrEqual(3)
    expect(run.scoreLeaks, `Text de puntuació visible: ${run.scoreLeaks.join(', ')}`).toEqual([])
    await expect(page).toHaveURL(/#\/poble$/)
    await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    // The character she made is already hers: the street, not the creator.
    await expect(page.getByRole('region', { name: 'Crea el teu personatge' })).toHaveCount(0)
    expect(consoleErrors).toEqual([])
  })

  test('després de recarregar continua al poble amb el perfil i el personatge', async ({ page }) => {
    await createProfile(page)
    await completeDiagnostic(page)

    await page.reload()
    await expect(page).toHaveURL(/#\/poble$/)
    await expect(page.getByTestId('street')).toBeVisible()
    await expect.poll(() => themeOf(page)).toBe(CHILD.theme)

    // Opening "/" or the old "/map" again resolves home to the town, not to the start screen.
    await page.goto('/')
    await expect(page).toHaveURL(/#\/poble$/)
    await page.goto('/#/map')
    await expect(page).toHaveURL(/#\/poble$/)
  })
})
