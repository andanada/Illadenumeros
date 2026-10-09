import type { Page } from '@playwright/test'
import { CHILD, createProfile, dumpProgress, expect, passAdultCheck, PROGRESS_STORES, seededTest as test } from './helpers'

/** Lock icon on the map -> solve the multiplication -> family page. */
async function passAdultGate(page: Page): Promise<void> {
  await page.goto('/#/poble')
  await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
  await page.getByRole('button', { name: 'Per a les famílies' }).click()
  await passAdultCheck(page)
  await expect(page).toHaveURL(/#\/familia$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Per a la família' })).toBeVisible()
}

test.describe('Per a la família', () => {
  test.beforeEach(async ({ context }) => {
    // Force the download path: the share sheet cannot be driven by Playwright.
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'share', { value: undefined, configurable: true })
      Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true })
    })
  })

  test('una còpia desada es recupera en un dispositiu nou amb el mateix progrés', async ({ page, browser, consoleErrors }, testInfo) => {
    await passAdultGate(page)
    await expect(page.getByText('Encara no has desat cap còpia del progrés.')).toBeVisible()
    const original = await dumpProgress(page)
    expect(original.skillStates.length).toBeGreaterThan(0)
    expect(original.attempts.length).toBeGreaterThan(0)

    const downloadEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Desa una còpia del progrés' }).click()
    const download = await downloadEvent
    expect(download.suggestedFilename()).toMatch(/^mates-magiques-\d{4}-\d{2}-\d{2}\.json$/)
    const file = testInfo.outputPath(download.suggestedFilename())
    await download.saveAs(file)
    await expect(page.getByRole('status')).toContainText('Còpia desada')
    await expect(page.getByText('Encara no has desat cap còpia del progrés.')).toBeHidden()

    // A brand-new device: the adult creates a profile, then restores the copy over it.
    // Explicit empty storage: inside a test, newContext() would otherwise inherit the seeded profile.
    const fresh = await browser.newContext({ baseURL: testInfo.project.use.baseURL, storageState: { cookies: [], origins: [] } })
    try {
      const other = await fresh.newPage()
      await createProfile(other)
      await other.goto('/#/familia')
      await other.getByLabel('Recupera una còpia').setInputFiles(file)
      const preview = other.getByRole('region', { name: 'Còpia trobada' })
      await expect(preview).toContainText(`Còpia de ${CHILD.name}`)
      await expect(preview).toContainText(String(original.attempts.length))
      await preview.getByRole('button', { name: 'Substitueix el progrés d’aquest dispositiu' }).click()
      await expect(other.getByRole('status')).toContainText('Còpia recuperada')
      expect(await dumpProgress(other)).toEqual(original)

      await other.goto('/#/poble')
      await expect(other.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    } finally {
      await fresh.close()
    }
    expect(consoleErrors).toEqual([])
  })

  test('esborrar el progrés demana confirmació amb el nom', async ({ page }) => {
    await passAdultGate(page)
    await page.getByRole('button', { name: 'Esborra tot el progrés' }).click()
    const confirm = page.getByRole('button', { name: 'Sí, esborra-ho tot' })
    await expect(confirm).toBeDisabled()
    const nameInput = page.getByLabel(`Escriu «${CHILD.name}» per confirmar`)
    await nameInput.fill('Una altra')
    await expect(confirm).toBeDisabled()

    // Backing out keeps everything.
    await page.getByRole('button', { name: 'No, deixa-ho estar' }).click()
    await expect(confirm).toBeHidden()
    expect((await dumpProgress(page)).profile).toHaveLength(1)

    await page.getByRole('button', { name: 'Esborra tot el progrés' }).click()
    await nameInput.fill(CHILD.name)
    await expect(confirm).toBeEnabled()
    await confirm.click()
    // The player stays (name, character, colour) and starts again from the diagnostic.
    await expect(page).toHaveURL(/#\/diagnostic$/)
    const after = await dumpProgress(page)
    expect(PROGRESS_STORES.map((s) => after[s]?.length)).toEqual([1, 0, 0, 0, 0])
    expect(after.profile?.[0]).toContain('"diagnosticDone":false')

    await page.goto('/')
    await expect(page).toHaveURL(/#\/diagnostic$/)
  })
})
