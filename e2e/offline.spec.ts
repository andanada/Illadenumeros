import { answerButton, CHILD, expect, seededTest as test, solve } from './helpers'

test.describe('Offline-first', () => {
  test('després de la primera càrrega, la navegació dins l’app funciona sense xarxa', async ({ page, context }) => {
    await page.goto('/#/poble')
    await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()

    // Warm up the lazy routes online (in dev there is no service worker to precache them).
    await page.evaluate(() => {
      window.location.hash = '#/mission'
    })
    await expect(page.getByRole('list', { name: /^Missió: 0 de 4 fets$/ })).toBeVisible()
    await page.getByRole('button', { name: 'Enrere' }).click()
    await expect(page).toHaveURL(/#\/poble$/)
    await page.evaluate(() => {
      window.location.hash = '#/play/repte-illa?skills=A4'
    })
    await expect(page.getByTestId('question-text')).toBeVisible()
    await page.getByRole('button', { name: 'Enrere' }).click()
    await expect(page).toHaveURL(/#\/poble$/)

    const swControlled = await page.evaluate(() => navigator.serviceWorker?.controller != null)
    test.info().annotations.push({ type: 'service-worker', description: swControlled ? 'actiu' : 'no actiu (mode dev)' })

    await context.setOffline(true)
    try {
      expect(await page.evaluate(() => navigator.onLine)).toBe(false)

      await page.evaluate(() => {
        window.location.hash = '#/mission'
      })
      await expect(page.getByRole('list', { name: /^Missió: 0 de 4 fets$/ })).toBeVisible()
      await page.getByRole('button', { name: 'Enrere' }).click()
      await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()

      // Playing offline still records answers in IndexedDB.
      await page.evaluate(() => {
        window.location.hash = '#/play/repte-illa?skills=A4'
      })
      const question = page.getByTestId('question-text')
      await expect(question).toBeVisible()
      const value = solve(await question.innerText())
      expect(value).toBeDefined()
      await answerButton(page.getByRole('group', { name: 'Respostes' }), value as string).click()
      await expect(page.getByText('Molt bé! ✨')).toBeVisible()

      await page.getByRole('button', { name: 'Enrere' }).click()
      await expect(page).toHaveURL(/#\/poble$/)
      await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    } finally {
      await context.setOffline(false)
    }
  })
})
