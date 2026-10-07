import type { Page } from '@playwright/test'
import { CHILD, expect, playerDbNames, seededTest as test } from './helpers'

const MASTERED = ['D1', 'D7']

/** Writes consolidated skill states straight into the player's database, as if 4t were already learnt. */
async function seedMastered(page: Page, skillIds: readonly string[]): Promise<void> {
  const dbName = (await playerDbNames(page))[CHILD.name]
  if (!dbName) throw new Error('No hi ha base de dades del jugador')
  await page.evaluate(
    async ({ name, ids }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(name)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const tx = database.transaction('skillStates', 'readwrite')
      for (const skillId of ids) {
        tx.objectStore('skillStates').put({
          skillId,
          accuracy: 0.8,
          fluency: 0,
          mastery: 0.8,
          status: 'consolidant',
          cpaStage: 'abstracte',
          attempts: 12,
          correct: 10,
          sessions: ['s1', 's2'],
          recent: [true, true, true],
          consecutiveErrors: 0,
          updatedAt: Date.now(),
        })
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      database.close()
    },
    { name: dbName, ids: [...skillIds] },
  )
}

test.describe('5è: Ciutat dels Decimals', () => {
  test('el mapa mostra la regió tancada fins que es domina 4t i després obre la primera parada', async ({ page, consoleErrors }) => {
    await page.goto('/#/map')
    const city = page.getByRole('region', { name: 'Ciutat dels Decimals' })
    await city.scrollIntoViewIfNeeded()
    await expect(city.getByText('5è de primària')).toBeVisible()
    await expect(city.getByText('Domina «Muntanya dels Milers» per obrir-la')).toBeVisible()
    await expect(city.getByRole('button', { name: /bloquejat/ })).toHaveCount(10)

    await seedMastered(page, MASTERED)
    await page.reload()
    await city.scrollIntoViewIfNeeded()
    await expect(city.getByText('Domina «Muntanya dels Milers» per obrir-la')).toBeHidden()
    const first = city.getByRole('button', { name: /^E1: Dècimes i centèsimes/ })
    await expect(first).toBeVisible()
    await first.click()

    const sheet = page.getByRole('dialog', { name: 'Dècimes i centèsimes' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: /Repte de l’Illa/ }).click()
    await expect(page).toHaveURL(/#\/play\/repte-illa\?skills=E1/)
    await expect(page.getByTestId('question-text')).toBeVisible()
    await expect(page.getByRole('group', { name: 'Respostes' }).getByRole('button').first()).toBeVisible()
    expect(consoleErrors).toEqual([])
  })

  test('el progrés per a adults inclou el grup 5è', async ({ page }) => {
    await page.goto('/#/progres')
    const gate = page.getByRole('dialog', { name: 'Només per a adults' })
    await expect(gate).toBeVisible()
    const prompt = (await gate.getByText(/^\d+ × \d+$/).innerText()).trim()
    const [a, b] = prompt.split(' × ').map(Number)
    await gate.getByLabel('Resultat').fill(String((a ?? 0) * (b ?? 0)))
    await gate.getByRole('button', { name: 'Entra' }).click()
    await expect(page.getByRole('group', { name: 'Habilitats de 5è' })).toBeVisible()
    await page.getByRole('button', { name: /^E10,/ }).click()
    await expect(page.getByText(/^E10 · Percentatges/)).toBeVisible()
  })
})
