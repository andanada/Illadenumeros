import type { Browser, Page } from '@playwright/test'
import { answerButton, CHILD, completeDiagnostic, createProfile, expect, passAdultCheck, petalsOnMap, solve, test } from './helpers'
import { SYNC_INVITE_CODE } from './syncEnv'

/*
 * Two browser contexts = two devices (tablet A, PC B) against the real API server started by
 * `npm run e2e:sync` (fresh database). Only the adult account UI is driven; the child just plays.
 */

const PASSWORD = 'una frase prou llarga 2026'
const newEmail = (tag: string) => `familia-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@exemple.cat`

const accountRegion = (page: Page) => page.getByRole('region', { name: 'Compte de la família' })

async function playOneQuestion(page: Page): Promise<void> {
  await page.goto('/#/play/repte-illa')
  const question = page.getByTestId('question-text')
  await expect(question).toBeVisible()
  const value = solve(await question.innerText())
  const answers = page.getByRole('group', { name: 'Respostes' })
  await (value === undefined ? answers.getByRole('button').first() : answerButton(answers, value)).click()
  await expect(page.getByText('Molt bé! ✨').or(page.getByText('Gairebé! Mirem-ho junts')).first()).toBeVisible()
  await page.goto('/#/map')
  await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
}

async function openFamily(page: Page): Promise<void> {
  await page.goto('/#/map')
  await page.getByRole('button', { name: 'Per a la família (només adults)' }).click()
  await passAdultCheck(page)
  await expect(page).toHaveURL(/#\/familia$/)
}

async function fillAuth(page: Page, mode: 'register' | 'login', email: string, password: string, invite = SYNC_INVITE_CODE): Promise<void> {
  const region = accountRegion(page)
  await region.getByRole('button', { name: mode === 'register' ? 'Crea un compte' : 'Entra', exact: true }).click()
  await region.getByLabel('Correu electrònic').fill(email)
  await region.getByLabel('Contrasenya', { exact: true }).fill(password)
  if (mode === 'register') await region.getByLabel('Codi d’invitació').fill(invite)
  await region.getByRole('button', { name: mode === 'register' ? 'Crea el compte' : 'Entra al compte' }).click()
}

async function syncNowAndWait(page: Page): Promise<void> {
  const region = accountRegion(page)
  await region.getByRole('button', { name: 'Sincronitza ara' }).click()
  await expect(region.getByText(/Última sincronització/)).toBeVisible()
  await expect(region.getByRole('button', { name: 'Sincronitza ara' })).toBeEnabled()
  await expect(region.getByRole('list', { name: 'Estat de cada jugador' }).getByText('Al dia').first()).toBeVisible()
}

/** A device without players logs in from the start screen (/compte) and picks the synced player. */
async function loginOnNewDevice(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/')
  await expect(page).toHaveURL(/#\/start$/)
  await page.getByRole('button', { name: /Ja teniu un compte de la família/ }).click()
  await passAdultCheck(page)
  await fillAuth(page, 'login', email, PASSWORD)
  await expect(accountRegion(page).getByText(email)).toBeVisible()
  await page.getByRole('button', { name: 'Tria qui juga' }).click()
  await page.getByRole('button', { name: new RegExp(`^Entra: ${CHILD.name}`) }).click()
  await expect(page).toHaveURL(/#\/map$/)
  return page
}

test.describe('Compte de la família i sincronització (servidor real)', () => {
  test('dos dispositius comparteixen el progrés; fora de línia; sortir; esborrar el compte', async ({ browser, page }) => {
    test.setTimeout(240_000)
    const email = newEmail('dos')

    // Device A: plays, then the adult creates the account (invite code) and syncs.
    await createProfile(page, CHILD)
    await completeDiagnostic(page)
    await playOneQuestion(page)
    const petalsA = await petalsOnMap(page)
    await openFamily(page)
    await fillAuth(page, 'register', email, PASSWORD)
    await expect(accountRegion(page).getByText(email)).toBeVisible()
    await syncNowAndWait(page)

    // Device B: logs in, the player appears with the same progress, and plays more.
    const pageB = await loginOnNewDevice(browser, email)
    await expect(pageB.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    await expect.poll(() => petalsOnMap(pageB)).toBe(petalsA)
    await playOneQuestion(pageB)
    const petalsB = await petalsOnMap(pageB)
    expect(petalsB).toBeGreaterThanOrEqual(petalsA)
    await openFamily(pageB)
    await syncNowAndWait(pageB)

    // A syncs (after a reload: the session is restored from the cookie) and sees B's progress.
    await page.goto('/#/familia')
    await expect(accountRegion(page).getByText(email)).toBeVisible()
    await syncNowAndWait(page)
    await page.goto('/#/map')
    await expect.poll(() => petalsOnMap(page)).toBe(petalsB)

    // A loses the server: plays anyway; the sync waits and catches up when it is back.
    await page.route('**/api/**', (route) => route.abort('internetdisconnected'))
    await playOneQuestion(page)
    const petalsOffline = await petalsOnMap(page)
    await page.goto('/#/familia')
    await accountRegion(page).getByRole('button', { name: 'Sincronitza ara' }).click()
    await expect(accountRegion(page).getByText(/Sense connexió/).first()).toBeVisible()
    await page.unroute('**/api/**')
    await page.context().setOffline(true)
    await page.context().setOffline(false) // fires `online`: the scheduler retries at once
    await expect(accountRegion(page).getByText(/Última sincronització/)).toBeVisible({ timeout: 20_000 })
    await openFamily(pageB)
    await syncNowAndWait(pageB)
    await pageB.goto('/#/map')
    await expect.poll(() => petalsOnMap(pageB)).toBe(petalsOffline)

    // B logs out: its local progress stays.
    await openFamily(pageB)
    await accountRegion(pageB).getByRole('button', { name: 'Surt' }).click()
    await expect(accountRegion(pageB).getByRole('button', { name: 'Crea el compte' })).toBeVisible()
    await pageB.goto('/#/map')
    await expect.poll(() => petalsOnMap(pageB)).toBe(petalsOffline)

    // A deletes the account (two confirmations + password): server data gone, local progress stays.
    await page.goto('/#/familia')
    const region = accountRegion(page)
    await region.getByRole('button', { name: 'Esborra el compte' }).click()
    await region.getByRole('button', { name: 'Sí, vull esborrar el compte' }).click()
    await region.getByLabel('Contrasenya del compte').fill(PASSWORD)
    await region.getByRole('button', { name: 'Esborra el compte definitivament' }).click()
    await expect(region.getByRole('button', { name: 'Crea el compte' })).toBeVisible()
    await page.goto('/#/map')
    await expect.poll(() => petalsOnMap(page)).toBe(petalsOffline)
    await openFamily(pageB)
    await fillAuth(pageB, 'login', email, PASSWORD)
    await expect(accountRegion(pageB).getByRole('alert')).toContainText('El correu o la contrasenya no són correctes')
    await pageB.context().close()
  })

  test('codi d’invitació incorrecte i contrasenya feble: errors clars en català', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Ja teniu un compte de la família/ }).click()
    await passAdultCheck(page)
    const region = accountRegion(page)
    await expect(region.getByText(/funciona igual sense compte/)).toBeVisible()
    await fillAuth(page, 'register', newEmail('err'), PASSWORD, 'codi-dolent')
    await expect(region.getByRole('alert')).toContainText('El codi d’invitació no és correcte')
    await region.getByLabel('Contrasenya', { exact: true }).fill('1234567890')
    await region.getByLabel('Codi d’invitació').fill(SYNC_INVITE_CODE)
    await region.getByRole('button', { name: 'Crea el compte' }).click()
    await expect(region.getByRole('alert')).toContainText('no és prou segura')
  })
})
