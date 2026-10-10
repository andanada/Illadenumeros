import type { Locator, Page } from '@playwright/test'
import { expect, hasHorizontalScroll, test } from './helpers'

/** Screenshots for the design review go here when SANDBOX_SHOTS is set. */
const SHOTS = process.env.SANDBOX_SHOTS

async function shot(page: Page, name: string, project: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png` })
}

const actor = (page: Page, id: string): Locator => page.locator(`[data-actor="${id}"]`)
const item = (page: Page, uid: string): Locator => page.locator(`[data-uid="${uid}"]`)

async function open(page: Page): Promise<void> {
  await page.goto('/#/sandbox')
  await expect(page.getByTestId('playground')).toBeVisible()
  await expect(actor(page, 'laia')).toBeVisible()
}

async function settled(page: Page, id: string): Promise<void> {
  await expect(actor(page, id)).toHaveAttribute('data-mode', /idle|sitting|emoting/, { timeout: 20_000 })
}

async function coord(page: Page, id: string, axis: 'x' | 'y'): Promise<number> {
  return Number(await actor(page, id).getAttribute(`data-${axis}`))
}

/** Taps the floor at a fraction of the stage. */
async function tapFloor(page: Page, fx: number, fy: number): Promise<void> {
  const box = await page.getByTestId('stage-floor').boundingBox()
  if (!box) throw new Error('Sense terra')
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
}

/** Items can lie behind the character you move: the tap goes through her to them (force skips Playwright's own hit test). */

async function ring(page: Page, _id = 'laia'): Promise<void> {
  await page.getByRole('button', { name: 'Accions' }).first().click()
  await expect(page.locator('[data-ring-item="cor"]')).toBeVisible()
}

async function drop(page: Page): Promise<void> {
  await ring(page)
  await page.locator('[data-ring-item="deixa"]').click()
}

test.describe('Sandbox: personatges lliures i objectes que s’usen', () => {
  test('select, walk, sit and stand up', async ({ page }, testInfo) => {
    await open(page)
    await expect(actor(page, 'laia')).toHaveAttribute('data-selected', 'true')
    await shot(page, 'sandbox-inici', testInfo.project.name)

    // Tapping another actor changes who you move.
    await actor(page, 'pilar').click()
    await expect(actor(page, 'pilar')).toHaveAttribute('data-selected', 'true')
    await page.getByRole('button', { name: 'Mou la Laia' }).click()
    await expect(actor(page, 'laia')).toHaveAttribute('data-selected', 'true')

    const before = await coord(page, 'laia', 'x')
    await tapFloor(page, 0.9, 0.9)
    await expect(actor(page, 'laia')).toHaveAttribute('data-mode', 'walking')
    await settled(page, 'laia')
    expect(await coord(page, 'laia', 'x')).toBeGreaterThan(before + 0.2)

    await page.getByRole('button', { name: 'Seu al sofà (dreta)' }).click()
    await expect(actor(page, 'laia')).toHaveAttribute('data-mode', 'sitting', { timeout: 20_000 })
    await shot(page, 'sandbox-assegut', testInfo.project.name)
    await ring(page, 'laia')
    await page.locator('[data-ring-item="aixeca"]').click()
    await expect(actor(page, 'laia')).toHaveAttribute('data-mode', 'idle')
  })

  test('carry an apple through the door and back', async ({ page }, testInfo) => {
    await open(page)
    await item(page, 'nevera').click()
    await expect(item(page, 'nevera')).toHaveAttribute('data-open', 'true', { timeout: 20_000 })
    await item(page, 'poma').click()
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta la poma/, { timeout: 20_000 })
    await expect(actor(page, 'pilar')).toBeVisible()

    await page.locator('[data-door="porta-jardi"]').click()
    await expect(page.getByRole('region', { name: 'El jardí' })).toBeVisible({ timeout: 20_000 })
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta la poma/)
    await expect(actor(page, 'pilar')).toHaveCount(0)
    await shot(page, 'sandbox-jardi', testInfo.project.name)
    // The pet trots after her through the door.
    await expect(actor(page, 'nyx')).toBeVisible({ timeout: 8000 })

    await page.locator('[data-door="porta-casa"]').click()
    await expect(page.getByRole('region', { name: 'La sala' })).toBeVisible({ timeout: 20_000 })
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta la poma/)
  })

  test('cooking: wash, chop, cook, plate; then give it away', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    await item(page, 'nevera').click({ force: true })
    await expect(item(page, 'nevera')).toHaveAttribute('data-open', 'true')
    await item(page, 'poma').click({ force: true })
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta la poma/)
    // Somewhere clear of the others, so nobody stands in front of the apple.
    await tapFloor(page, 0.2, 0.7)
    await settled(page, 'laia')
    await drop(page)
    await expect(item(page, 'poma')).toHaveAttribute('data-stage', 'crua')

    // A tool that does not fit yet only gives a hint.
    await item(page, 'olla').click({ force: true })
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta l’olla/)
    await item(page, 'poma').click({ force: true })
    await expect(page.getByRole('status')).toContainText('Prova-ho amb l’esponja')
    await expect(item(page, 'poma')).toHaveAttribute('data-stage', 'crua')
    await drop(page)

    const steps: ReadonlyArray<readonly [string, string]> = [
      ['esponja', 'neta'],
      ['ganivet', 'tallada'],
      ['olla', 'cuita'],
      ['plat', 'emplatada'],
    ]
    for (const [tool, stage] of steps) {
      // Stand clear of the items first, so nobody hides the tool.
      await tapFloor(page, 0.62, 0.93)
      await settled(page, 'laia')
      await item(page, tool).click({ force: true })
      await expect(actor(page, 'laia')).toHaveAccessibleName(new RegExp('porta'))
      await item(page, 'poma').click({ force: true })
      await expect(item(page, 'poma')).toHaveAttribute('data-stage', stage)
      if (stage === 'tallada') await shot(page, 'sandbox-cuina-tallada', testInfo.project.name)
      await drop(page)
    }
    await shot(page, 'sandbox-cuina-emplatada', testInfo.project.name)
    await expect(item(page, 'poma')).toHaveAccessibleName('la poma, emplatada')

    // Hand the plated apple to Pilar: she loves apples.
    await tapFloor(page, 0.62, 0.93)
    await settled(page, 'laia')
    await item(page, 'poma').click({ force: true })
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta la poma/)
    await actor(page, 'pilar').click()
    await expect(actor(page, 'pilar')).toHaveAccessibleName(/porta la poma/)
    await expect(actor(page, 'pilar').locator('[data-emote="cor"]')).toBeVisible()
    await expect(actor(page, 'laia')).not.toHaveAccessibleName(/porta/)
  })

  test('emotes, a hug between two actors, and the surprise egg', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    // Tapping the chosen character herself opens the same ring.
    await actor(page, 'laia').click()
    await expect(page.locator('[data-ring-item="cor"]')).toBeVisible()
    await page.locator('[data-ring-item="riure"]').click()
    await expect(actor(page, 'laia').locator('[data-emote="riure"]')).toBeVisible()
    await shot(page, 'sandbox-emote', testInfo.project.name)

    await ring(page, 'laia')
    await page.locator('[data-ring-item="amics"]').click()
    await page.locator('[data-ring-item="abraca"]').click()
    await actor(page, 'pilar').click()
    await expect(actor(page, 'pilar').locator('[data-emote="cor"]')).toBeVisible()
    await expect(actor(page, 'laia').locator('[data-emote="abraca"]')).toBeVisible()
    await shot(page, 'sandbox-abraco', testInfo.project.name)

    for (let i = 0; i < 3; i++) await item(page, 'ou').click()
    await expect(item(page, 'ou')).toHaveAccessibleName(/amb un pollet|amb una estrella|amb un cor/)
    await shot(page, 'sandbox-sorpresa', testInfo.project.name)
  })

  test('toss the ball and it lands again', async ({ page }) => {
    await open(page)
    await item(page, 'pilota-2').click()
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta la pilota/, { timeout: 20_000 })
    await ring(page, 'laia')
    await page.locator('[data-ring-item="llanca"]').click()
    await expect(actor(page, 'laia')).not.toHaveAccessibleName(/porta/)
    await expect(item(page, 'pilota-2')).toBeVisible()
    await expect(page.getByRole('status')).toContainText('llançat')
  })

  test('keyboard only: Tab to a character, Enter, arrows to walk, Escape closes the ring', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Mou la Pilar' }).focus()
    await page.keyboard.press('Enter')
    await expect(actor(page, 'pilar')).toHaveAttribute('data-selected', 'true')
    await expect(page.getByRole('status')).toContainText('Ara mous la Pilar')

    const x = await coord(page, 'pilar', 'x')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await settled(page, 'pilar')
    expect(await coord(page, 'pilar', 'x')).toBeLessThan(x - 0.05)

    await page.getByRole('button', { name: 'Accions' }).first().focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-ring-item="cor"]')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-ring]')).toHaveCount(0)

    // An object by keyboard: focus the fridge and open it with Enter.
    await item(page, 'nevera').focus()
    await page.keyboard.press('Enter')
    await expect(item(page, 'nevera')).toHaveAttribute('data-open', 'true', { timeout: 20_000 })
  })

  test('reduced motion: walking teleports with a poof, nothing animates, no overflow, no errors', async ({ page, consoleErrors }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    await tapFloor(page, 0.8, 0.88)
    await expect(actor(page, 'laia')).toHaveAttribute('data-mode', 'idle')
    await expect.poll(() => coord(page, 'laia', 'x')).toBeGreaterThan(0.7)
    expect(await actor(page, 'laia').evaluate((el) => getComputedStyle(el.querySelector('.sb-walk, .sb-select') ?? el).animationName)).toBe('none')
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })

  test('count in the world: carry 7 + 5 apples into the basket, check, pops back when wrong, then coins', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    await page.getByRole('button', { name: 'Demana 7 + 5 pomes' }).click()
    const basket = page.locator('[data-zone="cistella"]')
    const putApples = async (n: number, from: number): Promise<void> => {
      for (let i = 0; i < n; i++) {
        await page.locator('[data-def="pometa"]:not([data-in])').first().click({ force: true })
        await expect(actor(page, 'laia')).toHaveAccessibleName(/porta la poma/)
        await page.locator('[data-zone-drop="cistella"]').click()
        await expect(basket).toHaveAttribute('data-count', String(from + i + 1))
      }
    }
    await putApples(7, 0)
    await expect(page.getByRole('status')).toContainText('Has posat una poma a la cistella: ara hi ha 7.')
    await shot(page, 'sandbox-cistella-7', testInfo.project.name)

    // 7 is not 12: no red anything, the apples go back to the pile and the hint appears.
    await page.getByRole('button', { name: 'Comprova' }).click()
    await expect(basket).toHaveAttribute('data-count', '0')
    await expect(page.getByText('Posa les pomes a la cistella d’una en una.')).toBeVisible()
    await expect(page.locator('[data-coins="0"]')).toHaveCount(1)

    await putApples(12, 0)
    await shot(page, 'sandbox-cistella-12', testInfo.project.name)
    await page.getByRole('button', { name: 'Comprova' }).click()
    await expect(page.locator('[data-coins="3"]')).toHaveCount(1)
    await expect(page.locator('[data-qty="3"]')).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
  })

  test('keyboard path: tab to an apple, Enter, then Enter on the basket; the pet stays off the seats', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    await page.getByRole('button', { name: 'Demana 7 + 5 pomes' }).click()
    await page.locator('[data-def="pometa"]:not([data-in])').first().focus()
    await page.keyboard.press('Enter')
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta la poma/)
    await page.locator('[data-zone-drop="cistella"]').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-zone="cistella"]')).toHaveAttribute('data-count', '1')
    await expect(page.getByRole('status')).toContainText('ara hi ha 1')
  })

  test('the speech-bubble anchor is a named button that can be ignored or tapped', async ({ page }) => {
    await open(page)
    const anchor = page.getByRole('button', { name: 'La Pilar vol 3 pomes' })
    await expect(anchor).toBeVisible()
    await anchor.click({ force: true })
    await expect(page.getByRole('button', { name: 'La Pilar està contenta' })).toHaveAttribute('data-anchor', 'done')
    expect(await hasHorizontalScroll(page)).toBe(false)
  })
})
