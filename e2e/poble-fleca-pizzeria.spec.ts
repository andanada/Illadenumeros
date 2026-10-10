import type { Page } from '@playwright/test'
import { expect, hasHorizontalScroll, smallButtons } from './helpers'
import { playByHand } from './pobleBake'
import { actor, enterStreetPlace, MULTIPLYING, seedBoard, seedSkills, shot, townTest as test } from './pobleWorld'

const coins = async (page: Page): Promise<number> => Number(await page.getByTestId('coins').getAttribute('data-coins'))

/** Division has started: multiplication is mastered, a division fact is under way. */
const DIVIDING = { ...MULTIPLYING, C4: 'dominada', C5: 'dominada', D2: 'dominada', D3: 'dominada', C7: 'aprenent' } as const

async function enterFleca(page: Page): Promise<void> {
  await page.goto('/#/poble')
  await seedSkills(page, MULTIPLYING)
  await seedBoard(page, [{ place: 'fleca', count: 3, kind: 'repte', neighbour: 'la-fatima' }])
  await page.reload()
  await enterStreetPlace(page, /^Entra a la Fleca$/)
  await expect(page.getByRole('region', { name: 'La botiga de la fleca' })).toBeVisible()
}

async function enterPizzeria(page: Page): Promise<void> {
  await page.goto('/#/poble')
  await seedSkills(page, DIVIDING)
  await seedBoard(page, [{ place: 'pizzeria', count: 3, kind: 'repte', neighbour: 'la-fatima' }])
  await page.reload()
  await enterStreetPlace(page, /^Entra a la Pizzeria$/)
  await expect(page.getByRole('region', { name: 'La sala del restaurant' })).toBeVisible()
}

/** Buttons under 44 px; the characters walk about, so a button that goes away mid-measure is measured again. */
async function tinyButtons(page: Page): Promise<string[]> {
  for (let i = 0; i < 4; i++) {
    try {
      return await smallButtons(page, 44)
    } catch {
      await page.waitForTimeout(300)
    }
  }
  return smallButtons(page, 44)
}

const bubble = (page: Page) => page.getByRole('button', { name: /toca per atendre/ })

test.describe('Poble: Fleca', () => {
  test('free play: walk, carry dough through the bakehouse, bake it in the oven', async ({ page }, testInfo) => {
    await enterFleca(page)
    await shot(page, 'fleca-botiga', testInfo.project.name)
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.locator('[data-door="porta-obrador"]').click()
    await expect(page.getByRole('region', { name: 'L’obrador' })).toBeVisible({ timeout: 25_000 })
    await shot(page, 'fleca-obrador', testInfo.project.name)
    await page.locator('[data-door="porta-farina"]').click()
    await expect(page.getByRole('region', { name: 'El magatzem de farina' })).toBeVisible({ timeout: 25_000 })
    await page.locator('[data-uid="caixa-massa"]').click()
    await expect(page.locator('[data-uid="caixa-massa"]')).toHaveAttribute('data-open', 'true')
    await shot(page, 'fleca-farina', testInfo.project.name)
    await page.locator('[data-def="pasta-croissant"]').first().click()
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta/, { timeout: 20_000 })
    await page.locator('[data-door="porta-obrador"]').click()
    await expect(page.getByRole('region', { name: 'L’obrador' })).toBeVisible({ timeout: 25_000 })
    await page.getByRole('button', { name: 'Deixa-ho al forn' }).click()
    await expect(page.locator('[data-in="forn"][data-def="croissant-calent"]')).toBeVisible({ timeout: 25_000 })
    await shot(page, 'fleca-forn', testInfo.project.name)
    expect(await hasHorizontalScroll(page)).toBe(false)
  })

  test('a request is played with the hands and pays coins; «Ara no» costs nothing', async ({ page }, testInfo) => {
    test.setTimeout(150_000)
    await enterFleca(page)
    const before = await coins(page)
    await bubble(page).dispatchEvent('click')
    await shot(page, 'fleca-peticio', testInfo.project.name)
    await page.getByRole('button', { name: 'Ara no' }).click()
    expect(await coins(page)).toBe(before)

    // The price tags are the fallback for what does not fit the room: look for one played with the hands.
    const kind = await playByHand(page, 'fleca', 'tap', (k) => shot(page, `fleca-${k}-obert`, testInfo.project.name))
    await shot(page, `fleca-${kind}-fet`, testInfo.project.name)
    await expect(page.getByRole('button', { name: 'Adéu!' })).toBeVisible({ timeout: 15_000 })
    await expect.poll(() => coins(page)).toBeGreaterThan(before)
    expect(await tinyButtons(page)).toEqual([])
    expect(await hasHorizontalScroll(page)).toBe(false)
  })

  test('keyboard only: a request is laid out and checked with Enter', async ({ page }) => {
    test.setTimeout(150_000)
    await enterFleca(page)
    const kind = await playByHand(page, 'fleca', 'keyboard', undefined, 12)
    expect(kind.length).toBeGreaterThan(0)
  })

  test('reduced motion: the bakery still plays and nobody loops', async ({ page }) => {
    test.setTimeout(150_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await enterFleca(page)
    const kind = await playByHand(page, 'fleca', 'tap', undefined, 12)
    expect(kind.length).toBeGreaterThan(0)
  })
})

test.describe('Poble: Pizzeria', () => {
  test('free play: the rooms, the oven and the scooter', async ({ page }, testInfo) => {
    await enterPizzeria(page)
    await shot(page, 'pizzeria-sala', testInfo.project.name)
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.locator('[data-door="porta-cuina"]').click()
    await expect(page.getByRole('region', { name: 'La cuina' })).toBeVisible({ timeout: 25_000 })
    await shot(page, 'pizzeria-cuina', testInfo.project.name)
    await page.locator('[data-uid="pastera"]').click()
    await expect(page.locator('[data-uid="pastera"]')).toHaveAttribute('data-open', 'true')
    await page.locator('[data-def="massa-pizza"]').first().click()
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta/, { timeout: 20_000 })
    await page.getByRole('button', { name: 'Deixa-ho al forn' }).click()
    await expect(page.locator('[data-in="forn-pizza"][data-def="pizza-cuita"]')).toBeVisible({ timeout: 25_000 })
    await page.locator('[data-uid="tallador-8"]').click()
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta/, { timeout: 20_000 })
    await page.locator('[data-def="pizza-cuita"]').first().click()
    await expect(page.locator('[data-def="tros"]')).toHaveCount(8, { timeout: 25_000 })
    await shot(page, 'pizzeria-trossos', testInfo.project.name)
    expect(await hasHorizontalScroll(page)).toBe(false)
  })

  test('a request is played with the hands and pays coins; «Ara no» costs nothing', async ({ page }, testInfo) => {
    test.setTimeout(150_000)
    await enterPizzeria(page)
    const before = await coins(page)
    await bubble(page).dispatchEvent('click')
    await shot(page, 'pizzeria-peticio', testInfo.project.name)
    await page.getByRole('button', { name: 'Ara no' }).click()
    expect(await coins(page)).toBe(before)
    // Cutting needs three rooms (see the component test); sharing onto plates is played here.
    const kind = await playByHand(page, 'pizzeria', 'tap', (k) => shot(page, `pizzeria-${k}-obert`, testInfo.project.name))
    await shot(page, `pizzeria-${kind}-fet`, testInfo.project.name)
    await expect(page.getByRole('button', { name: 'Adéu!' })).toBeVisible({ timeout: 15_000 })
    await expect.poll(() => coins(page)).toBeGreaterThan(before)
    expect(await tinyButtons(page)).toEqual([])
    expect(await hasHorizontalScroll(page)).toBe(false)
  })

  test('keyboard and reduced motion: a request can be answered without a pointer', async ({ page }) => {
    test.setTimeout(150_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await enterPizzeria(page)
    const kind = await playByHand(page, 'pizzeria', 'keyboard', undefined, 12)
    expect(kind.length).toBeGreaterThan(0)
  })
})
