import type { Page } from '@playwright/test'
import { CHILD, expect, hasHorizontalScroll, passAdultCheck, playerDbNames, seededTest as test } from './helpers'

/** Three correct answers at the shop, yesterday: the parents' view should show a visit to the Botiga. */
async function seedShopVisits(page: Page): Promise<void> {
  const dbName = (await playerDbNames(page))[CHILD.name]
  if (!dbName) throw new Error('No hi ha base de dades del jugador')
  const at = Date.now() - 86_400_000
  await page.evaluate(
    async ({ name, base }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(name)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const tx = database.transaction('attempts', 'readwrite')
      for (let i = 0; i < 3; i++) {
        tx.objectStore('attempts').put({
          id: `seed-poble-${i}`,
          ambitId: 'mates',
          skillId: 'A3',
          correct: true,
          rtMs: 2000,
          hintsUsed: 0,
          cpaStage: 'abstracte',
          gameId: 'poble-botiga',
          sessionId: 'seed-poble',
          createdAt: base + i * 5000,
        })
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      database.close()
    },
    { name: dbName, base: at },
  )
}

async function openFamily(page: Page): Promise<void> {
  await page.goto('/#/poble')
  await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
  await page.getByRole('button', { name: 'Per a les famílies' }).click()
  await passAdultCheck(page)
  await expect(page).toHaveURL(/#\/familia$/)
}

test.describe('El poble per als adults', () => {
  test('el progrés mostra el poble: llocs, tarro d’avui, setmana, monedes i visites', async ({ page, consoleErrors }) => {
    await page.goto('/#/poble')
    await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    await seedShopVisits(page)
    await page.goto('/#/progres')
    await page.reload()
    await passAdultCheck(page)
    const town = page.getByRole('region', { name: 'El poble' })
    await expect(town).toBeVisible()
    await expect(town.getByRole('heading', { name: 'Avui' })).toBeVisible()
    await expect(town.getByRole('progressbar', { name: 'Tarro d’estrelles d’avui' })).toBeVisible()
    const places = town.getByRole('list', { name: 'Llocs del poble' })
    await expect(places.getByText('Els Recreatius')).toBeVisible()
    await expect(places.getByText('Obert', { exact: true }).first()).toBeVisible()
    await expect(places.getByText(/S’obre (quan|amb)/).first()).toBeVisible()
    await expect(town.getByText('Encàrrecs resolts (7 dies)')).toBeVisible()
    await expect(town.getByText('Monedes que té ara')).toBeVisible()
    const visits = town.getByRole('list', { name: /Visites dels últims 14 dies/ })
    await expect(visits).toContainText('La Botiga')
    await expect(visits).toContainText('3 respostes')
    await expect(page.locator('body')).not.toContainText(/NaN|Infinity/)
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })

  test('la targeta Poble de la família canvia els minuts diaris i es manté en recarregar', async ({ page, consoleErrors }) => {
    await openFamily(page)
    const group = page.getByRole('radiogroup', { name: 'Minuts de matemàtiques al dia' })
    await expect(group).toBeVisible()
    await expect(group.getByRole('radio', { name: '12 min' })).toBeChecked()
    await group.getByRole('radio', { name: '20 min' }).click()
    await expect(group.getByRole('radio', { name: '20 min' })).toBeChecked()
    await expect(page.getByRole('status')).toContainText('20 minuts')
    expect(await hasHorizontalScroll(page)).toBe(false)

    await page.reload()
    await expect(page.getByRole('radiogroup', { name: 'Minuts de matemàtiques al dia' }).getByRole('radio', { name: '20 min' })).toBeChecked()
    expect(consoleErrors).toEqual([])
  })
})
