import type { Page } from '@playwright/test'
import {
  answerButton,
  CHILD,
  completeDiagnostic,
  createProfile,
  dumpProgress,
  expect,
  fillOnboarding,
  passAdultCheck,
  petalsOnMap,
  playerDbNames,
  SECOND_CHILD,
  solve,
  test,
  themeOf,
} from './helpers'

/** Accessible names of the skill stops with their stars, e.g. "Sumes fins a 10: 2 de 3 estrelles". */
const starLabels = async (page: Page): Promise<string[]> =>
  (await page.getByRole('button', { name: /de 3 estrelles$/ }).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''))).sort()

const databaseNames = (page: Page): Promise<string[]> =>
  page.evaluate(async () => (await indexedDB.databases()).flatMap((d) => (d.name ? [d.name] : [])).sort())

/** One correct answer in "El Repte de l'Illa", then back to the map. */
async function playOneQuestion(page: Page): Promise<void> {
  await page.goto('/#/play/repte-illa')
  const question = page.getByTestId('question-text')
  await expect(question).toBeVisible()
  const value = solve(await question.innerText())
  const answers = page.getByRole('group', { name: 'Respostes' })
  await (value === undefined ? answers.getByRole('button').first() : answerButton(answers, value)).click()
  await expect(page.getByText('Molt bé! ✨').or(page.getByText('Gairebé! Mirem-ho junts')).first()).toBeVisible()
  await page.goto('/#/map')
}

const changePlayer = async (page: Page, current: string): Promise<void> => {
  await page.getByRole('button', { name: `${current} · Canvia de jugador/a` }).click()
  await expect(page).toHaveURL(/#\/qui-juga$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Qui juga?' })).toBeVisible()
}

test.describe('Diversos jugadors en un mateix dispositiu', () => {
  test('cada infant té el seu progrés, es pot canviar de jugador i esborrar-ne un', async ({ page, consoleErrors }) => {
    test.setTimeout(180_000)

    // Player 1: onboarding, diagnostic and one extra answer.
    await createProfile(page, CHILD)
    await completeDiagnostic(page)
    await playOneQuestion(page)
    await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    const laiaPetals = await petalsOnMap(page)
    const laiaStars = await starLabels(page)
    const laiaRows = await dumpProgress(page, CHILD.name)
    expect(laiaPetals).toBeGreaterThan(0)

    // Player 2 is added from the picker, behind the adult check.
    await changePlayer(page, CHILD.name)
    expect(await themeOf(page)).toBeUndefined()
    await expect(page.getByRole('button', { name: `Entra: ${CHILD.name}` })).toBeVisible()
    await page.getByRole('button', { name: 'Nou jugador o jugadora (només adults)' }).click()
    await passAdultCheck(page)
    await fillOnboarding(page, SECOND_CHILD)
    await completeDiagnostic(page)
    await expect(page.getByText(`Hola, ${SECOND_CHILD.name}!`)).toBeVisible()
    expect(await themeOf(page)).toBe(SECOND_CHILD.theme)
    const pauPetals = await petalsOnMap(page)
    expect(pauPetals).not.toBe(laiaPetals)
    expect((await dumpProgress(page, SECOND_CHILD.name)).attempts.length).toBeLessThan(laiaRows.attempts?.length ?? 0)

    // Back to player 1: everything as she left it.
    await changePlayer(page, SECOND_CHILD.name)
    await page.getByRole('button', { name: `Entra: ${CHILD.name}` }).click()
    await expect(page).toHaveURL(/#\/map$/)
    await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    await expect.poll(() => themeOf(page)).toBe(CHILD.theme)
    expect(await petalsOnMap(page)).toBe(laiaPetals)
    expect(await starLabels(page)).toEqual(laiaStars)
    expect((await dumpProgress(page, CHILD.name)).attempts).toEqual(laiaRows.attempts)

    // A reload keeps both players, and with two of them the app asks who plays.
    await page.reload()
    await expect(page).toHaveURL(/#\/qui-juga$/)
    await expect(page.getByRole('button', { name: `Entra: ${CHILD.name}` })).toBeVisible()
    await expect(page.getByRole('button', { name: `Entra: ${SECOND_CHILD.name}` })).toBeVisible()

    // The adult deletes player 2 from the family page.
    await page.getByRole('button', { name: `Entra: ${CHILD.name}` }).click()
    await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    const pauDb = (await playerDbNames(page))[SECOND_CHILD.name]
    expect(pauDb).toMatch(/^mates-magiques-[0-9a-f-]{36}$/)
    await page.getByRole('button', { name: 'Per a la família (només adults)' }).click()
    await passAdultCheck(page)
    const players = page.getByRole('region', { name: 'Jugadors' })
    await players.getByRole('button', { name: `Esborra ${SECOND_CHILD.name}` }).click()
    await players.getByLabel(`Escriu «${SECOND_CHILD.name}» per confirmar`).fill(SECOND_CHILD.name)
    await players.getByRole('button', { name: `Sí, esborra ${SECOND_CHILD.name}` }).click()
    await expect(page.getByRole('status')).toContainText('Jugador esborrat')
    await expect(players.getByText(SECOND_CHILD.name, { exact: true })).toBeHidden()
    expect(Object.keys(await playerDbNames(page))).toEqual([CHILD.name])
    expect(await databaseNames(page)).not.toContain(pauDb)

    // Only player 1 remains: the app skips the picker and her progress is intact.
    await page.goto('/')
    await page.reload()
    await expect(page).toHaveURL(/#\/map$/)
    await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    expect(await petalsOnMap(page)).toBe(laiaPetals)
    expect(consoleErrors).toEqual([])
  })
})
