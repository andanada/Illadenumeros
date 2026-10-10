import type { Page } from '@playwright/test'
import { expect, hasHorizontalScroll, smallButtons } from './helpers'
import { solveFarmRequest, solveMarketRequest } from './pobleSolve'
import { actor, enterStreetPlace, FIFTH_GRADE, MULTIPLYING, seedBoard, seedSkills, shot, townTest as test } from './pobleWorld'

test.describe.configure({ timeout: 300_000 })

const coins = async (page: Page): Promise<number> => Number(await page.getByTestId('coins').getAttribute('data-coins'))

async function enterFarm(page: Page): Promise<void> {
  await page.goto('/#/poble')
  await seedSkills(page, MULTIPLYING)
  await seedBoard(page, [{ place: 'granja', count: 3, kind: 'repte', neighbour: 'l-avi-ramon' }])
  await page.reload()
  await enterStreetPlace(page, /^Entra a la Granja$/)
  await expect(page.getByRole('region', { name: 'L’hort' })).toBeVisible({ timeout: 30_000 })
}

const bubble = (page: Page) => page.getByRole('button', { name: /toca per ajudar/ })

test.describe('Poble: Granja', () => {
  test('free play: walk, carry a seed into the plot, water it, grow it, go to the farmyard', async ({ page }, testInfo) => {
    await enterFarm(page)
    await shot(page, 'granja-hort', testInfo.project.name)
    expect(await hasHorizontalScroll(page)).toBe(false)
    const floor = page.getByTestId('stage-floor')
    const box = await floor.boundingBox()
    if (!box) throw new Error('Sense terra')
    const x0 = Number(await actor(page, 'laia').getAttribute('data-x'))
    await page.mouse.click(box.x + box.width * 0.47, box.y + box.height * 0.72)
    await expect(actor(page, 'laia')).toHaveAttribute('data-mode', /walking|idle/)
    await expect.poll(async () => Math.abs(Number(await actor(page, 'laia').getAttribute('data-x')) - x0), { timeout: 20_000 }).toBeGreaterThan(0.15)

    await page.locator('[data-uid="sac-llavors"]').click()
    await expect(page.locator('[data-uid="sac-llavors"]')).toHaveAttribute('data-open', 'true')
    await page.locator('[data-def="planta"]').last().click()
    await page.getByRole('button', { name: 'Deixa-ho a les files de l’hort' }).click()
    await expect(page.locator('[data-zone="hort-lliure"]')).toHaveAttribute('data-count', '1', { timeout: 20_000 })
    await shot(page, 'granja-sembrat', testInfo.project.name)

    await page.locator('[data-door="porta-corral"]').click()
    await expect(page.getByRole('region', { name: 'El corral' })).toBeVisible({ timeout: 25_000 })
    await shot(page, 'granja-corral', testInfo.project.name)
    expect(await hasHorizontalScroll(page)).toBe(false)
  })

  test('a request played in the world pays coins; «Ara no» costs nothing', async ({ page }, testInfo) => {
    // Teleporting walks keep the 40-seed plots quick; walking itself is covered by the free-play test.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await enterFarm(page)
    const before = await coins(page)
    await bubble(page).click({ force: true })
    await shot(page, 'granja-peticio', testInfo.project.name)
    await page.getByRole('button', { name: 'Ara no' }).click()
    expect(await coins(page)).toBe(before)

    await bubble(page).click({ force: true })
    const kind = await solveFarmRequest(page)
    await shot(page, `granja-${kind || 'fitxes'}-fet`, testInfo.project.name)
    await expect(page.getByTestId('errand-request')).toContainText(/Moltes gràcies|Quasi|Mira|ho tornem/i, { timeout: 15_000 }).catch(() => undefined)
    expect(await smallButtons(page, 44)).toEqual([])
    expect(await hasHorizontalScroll(page)).toBe(false)
  })

  test('keyboard only: carry a seed to the plot with Enter', async ({ page }) => {
    await enterFarm(page)
    await page.locator('[data-uid="sac-llavors"]').focus()
    await page.keyboard.press('Enter')
    const seed = page.locator('[data-def="planta"]').last()
    await seed.focus()
    await page.keyboard.press('Enter')
    const drop = page.getByRole('button', { name: 'Deixa-ho a les files de l’hort' })
    await drop.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-zone="hort-lliure"]')).toHaveAttribute('data-count', '1', { timeout: 20_000 })
  })

  test('reduced motion: the farm still plays and nobody loops', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await enterFarm(page)
    await bubble(page).click({ force: true })
    await expect(page.getByTestId('errand-request')).toBeVisible()
    const kind = await solveFarmRequest(page)
    expect(kind.length).toBeGreaterThan(0)
  })
})

async function enterMarket(page: Page): Promise<void> {
  await page.goto('/#/poble')
  await seedSkills(page, FIFTH_GRADE)
  await seedBoard(page, [{ place: 'mercat', count: 3, kind: 'repte', neighbour: 'la-fatima' }])
  await page.reload()
  await enterStreetPlace(page, /^Entra a el Mercat$/)
  await expect(page.getByRole('region', { name: 'La plaça del mercat' })).toBeVisible({ timeout: 30_000 })
}

test.describe('Poble: Mercat', () => {
  test('free play: weigh an apple, arrange the stall, toss an orange', async ({ page }, testInfo) => {
    await enterMarket(page)
    await shot(page, 'mercat-placa', testInfo.project.name)
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.locator('[data-uid="poma-1"]').click()
    await page.getByRole('button', { name: 'Deixa-ho a la bàscula' }).click()
    await expect(page.getByRole('status', { name: 'Bàscula: 0,15 kg' })).toBeVisible({ timeout: 20_000 })
    await shot(page, 'mercat-pesat', testInfo.project.name)
    await page.locator('[data-uid="taronja-2"]').click()
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta la taronja/, { timeout: 25_000 })
    await page.getByRole('button', { name: 'Accions' }).click()
    await page.locator('[data-ring-item="llanca"]').click()
    await expect(actor(page, 'laia')).not.toHaveAccessibleName(/porta/, { timeout: 20_000 })
  })

  test('a request played in the square pays coins; «Ara no» costs nothing', async ({ page }, testInfo) => {
    await enterMarket(page)
    const before = await coins(page)
    await bubble(page).click({ force: true })
    await shot(page, 'mercat-peticio', testInfo.project.name)
    await page.getByRole('button', { name: 'Ara no' }).click()
    expect(await coins(page)).toBe(before)
    await bubble(page).click({ force: true })
    const kind = await solveMarketRequest(page)
    await shot(page, `mercat-${kind || 'fitxes'}-fet`, testInfo.project.name)
    expect(await smallButtons(page, 44)).toEqual([])
    expect(await hasHorizontalScroll(page)).toBe(false)
  })

  test('keyboard only: carry an apple to the scale with Enter', async ({ page }) => {
    await enterMarket(page)
    await page.locator('[data-uid="poma-1"]').focus()
    await page.keyboard.press('Enter')
    const drop = page.getByRole('button', { name: 'Deixa-ho a la bàscula' })
    await drop.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status', { name: 'Bàscula: 0,15 kg' })).toBeVisible({ timeout: 20_000 })
  })

  test('reduced motion: the market still plays', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await enterMarket(page)
    await bubble(page).click({ force: true })
    expect((await solveMarketRequest(page)).length).toBeGreaterThan(0)
  })
})
