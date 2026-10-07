import type { Page } from '@playwright/test'
import { answerButton, expect, feedbackStatus, NEGATIVE_RE, seededTest as test, solve } from './helpers'

async function openGame(page: Page, gameId: string, title: string): Promise<void> {
  await page.goto(`/#/play/${gameId}`)
  await expect(page).toHaveURL(new RegExp(`#/play/${gameId}`))
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
}

/** Friend of the highlighted bubble, read from the round text (A5 `a + ? = 10`, A3 `t = p + ?`, A8 `a + b = ?`). */
function bubbleFriend(text: string): number | undefined {
  let m = /^(\d+) \+ \? = (\d+)$/.exec(text)
  if (m) return Number(m[2]) - Number(m[1])
  m = /^(\d+) = (\d+) \+ \?$/.exec(text)
  if (m) return Number(m[1]) - Number(m[2])
  m = /^(\d+) \+ (\d+) = \?$/.exec(text)
  if (m) return 10 - Math.max(Number(m[1]), Number(m[2]))
  return undefined
}

test.describe('Jocs: smoke', () => {
  test('El Repte de l’Illa: es pot respondre una pregunta', async ({ page, consoleErrors }) => {
    await openGame(page, 'repte-illa', 'El Repte de l’Illa')
    const question = page.getByTestId('question-text')
    await expect(question).toBeVisible()
    const value = solve(await question.innerText())
    const answers = page.getByRole('group', { name: 'Respostes' })
    const target = value === undefined ? answers.getByRole('button').first() : answerButton(answers, value)
    await target.click()
    await expect(page.getByText('Molt bé! ✨').or(page.getByText('Gairebé! Mirem-ho junts')).first()).toBeVisible()
    if (value !== undefined) await expect(page.getByText('Molt bé! ✨')).toBeVisible()
    expect(consoleErrors).toEqual([])
  })

  test('Duel Llampec: un error amable i després l’encert', async ({ page, consoleErrors }) => {
    await openGame(page, 'duel-llampec', 'Duel Llampec')
    await expect(page.getByText('Qui arriba a les estrelles?')).toBeVisible()
    const question = page.getByTestId('duel-question')
    const value = solve(await question.innerText())
    expect(value, 'El duel només hauria de mostrar fets aritmètics').toBeDefined()
    const answers = page.getByRole('group', { name: 'Respostes' })
    const wrong = answers.getByRole('button').filter({ hasNotText: new RegExp(`^${value}$`) }).first()
    await wrong.click()
    await expect(page.getByText('Gairebé! Torna-ho a provar')).toBeVisible()
    await expect(wrong).toBeDisabled()
    await answerButton(answers, value as string).click()
    await expect(page.getByText('Gairebé! Torna-ho a provar')).toBeHidden()
    expect(consoleErrors).toEqual([])
  })

  test('Bombolles Amigues del 10: tocar l’amic uneix les bombolles', async ({ page, consoleErrors }) => {
    // The bubbles drift forever; reduced motion keeps them still so the tap lands where the child aims.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openGame(page, 'bombolles', 'Bombolles Amigues del 10')
    await expect(page.getByRole('button', { name: /^Bombolla \d+$/ }).first()).toBeVisible()
    const text = (await page.locator('main').getByText(/^[\d? +=]+$/).first().innerText()).trim()
    const friend = bubbleFriend(text)
    expect(friend, `Ronda no reconeguda: "${text}"`).toBeDefined()
    const status = feedbackStatus(page)
    await expect(status).toHaveText(/amic/)
    await page.locator(`button[aria-label="Bombolla ${friend}"][aria-pressed="false"]`).first().click()
    await expect(status).toHaveText(/Molt bé|Has fet 10/)
    expect(consoleErrors).toEqual([])
  })

  test('El Marc Màgic: es pot fer una acció al marc', async ({ page, consoleErrors }) => {
    await openGame(page, 'marc-magic', 'El Marc Màgic')
    const tray = page.getByRole('group', { name: /^Safata amb \d+ fitxes$/ })
    const showFrame = page.getByRole('button', { name: 'Mostra el marc' })
    const answers = page.getByRole('group', { name: 'Respostes' })
    await expect(tray.or(showFrame).or(answers).first()).toBeVisible()

    if (await tray.isVisible()) {
      const label = (await tray.getAttribute('aria-label')) ?? ''
      const before = Number(/\d+/.exec(label)?.[0])
      await tray.getByRole('button').first().click()
      if (before > 1) await expect(page.getByRole('group', { name: `Safata amb ${before - 1} fitxes` })).toBeVisible()
      else await expect(page.getByRole('group', { name: `Safata amb ${before} fitxes` })).toBeHidden()
    } else if (await showFrame.isVisible()) {
      await showFrame.click()
      await expect(showFrame).toBeHidden()
    } else {
      await answers.getByRole('button').first().click()
      await expect(feedbackStatus(page)).toHaveText(/^(Molt bé|Gairebé)/)
    }
    expect(consoleErrors).toEqual([])
  })

  test('Cursa a la Recta: un salt mou el personatge', async ({ page, consoleErrors }) => {
    await openGame(page, 'cursa-recta', 'Cursa a la Recta')
    const jumps = page.getByRole('group', { name: 'Salts' })
    const answers = page.getByRole('group', { name: 'Respostes' })
    await expect(jumps.or(answers).first()).toBeVisible()

    if (await jumps.isVisible()) {
      const line = page.getByRole('img', { name: /^Recta numèrica\. Ets al \d+/ })
      const from = Number(/Ets al (\d+)/.exec((await line.getAttribute('aria-label')) ?? '')?.[1])
      const forward = page.getByRole('button', { name: 'Salta 1 endavant' })
      const backward = page.getByRole('button', { name: 'Salta 1 enrere' })
      const useForward = await forward.isEnabled()
      await (useForward ? forward : backward).click()
      const expected = useForward ? from + 1 : from - 1
      await expect(page.getByRole('img', { name: new RegExp(`Ets al ${expected}\\.`) })).toBeVisible()
      await expect(page.getByRole('button', { name: '↶ Torna enrere' })).toBeEnabled()
    } else {
      await answers.getByRole('button').first().click()
      await expect(feedbackStatus(page)).toHaveText(/Sí! La fletxa|Gairebé/)
    }
    expect(consoleErrors).toEqual([])
  })
})

test.describe('Jocs de 3r i 4t: smoke', () => {
  async function openSkillGame(page: Page, gameId: string, skill: string, title: string): Promise<void> {
    await page.goto(`/#/play/${gameId}?skills=${skill}`)
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
  }

  test('La Fleca de les Files: una magdalena va a la safata', async ({ page, consoleErrors }) => {
    await openSkillGame(page, 'fleca-files', 'C4', 'La Fleca de les Files')
    const basket = page.getByRole('group', { name: /^Cistella amb \d+ magdalenes$/ })
    const showTray = page.getByRole('button', { name: 'Mostra la safata' })
    const answers = page.getByRole('group', { name: 'Respostes' })
    await expect(basket.or(showTray).or(answers).first()).toBeVisible()

    if (await basket.isVisible()) {
      await expect(page.getByRole('img', { name: /: 0 magdalenes posades$/ })).toBeVisible()
      await basket.getByRole('button').first().click()
      await expect(page.getByRole('img', { name: /: 1 magdalenes posades$/ })).toBeVisible()
    } else if (await showTray.isVisible()) {
      await showTray.click()
      await expect(page.getByRole('img', { name: /^Safata de/ })).toBeVisible()
    } else {
      await answers.getByRole('button').first().click()
      await expect(feedbackStatus(page)).toHaveText(/^(Molt bé|Gairebé)/)
    }
    expect(consoleErrors).toEqual([])
  })

  test('Repartim Llaminadures: una llaminadura va a un plat', async ({ page, consoleErrors }) => {
    await openSkillGame(page, 'llaminadures', 'C6', 'Repartim Llaminadures')
    const basket = page.getByRole('group', { name: /^Cistella amb \d+ llaminadures$/ })
    const showPlates = page.getByRole('button', { name: 'Mostra els plats' })
    const answers = page.getByRole('group', { name: 'Respostes' })
    await expect(basket.or(showPlates).or(answers).first()).toBeVisible()

    if (await basket.isVisible()) {
      await page.getByRole('button', { name: /^Plat 1: 0 llaminadures/ }).click()
      await expect(page.getByRole('button', { name: /^Plat 1: 1 llaminadures/ })).toBeVisible()
    } else if (await showPlates.isVisible()) {
      await showPlates.click()
      await expect(page.getByRole('button', { name: /^Plat 1:/ })).toBeVisible()
    } else {
      await answers.getByRole('button').first().click()
      await expect(feedbackStatus(page)).toHaveText(/^(Molt bé|Gairebé)/)
    }
    expect(consoleErrors).toEqual([])
  })

  test('La Botiga de la Pluja: una moneda puja al taulell o es tria la resposta', async ({ page, consoleErrors }) => {
    await openSkillGame(page, 'botiga-pluja', 'C9', 'La Botiga de la Pluja')
    const purse = page.getByRole('group', { name: 'Cartera' })
    const answers = page.getByRole('group', { name: 'Respostes' })
    await expect(purse.or(answers).first()).toBeVisible()

    if (await purse.isVisible()) {
      await purse.getByRole('button').first().click()
      await expect(page.getByRole('button', { name: /^Treu / })).toBeVisible()
    } else {
      await answers.getByRole('button').first().click()
      await expect(feedbackStatus(page)).toHaveText(/^(Molt bé|Gairebé)/)
    }
    expect(consoleErrors).toEqual([])
  })
})

test.describe('Escala d’ajudes', () => {
  test('3 errors seguits mostren la solució amb "Continua", sense res negatiu', async ({ page, consoleErrors }) => {
    await page.goto('/#/play/repte-illa?skills=A4')
    const question = page.getByTestId('question-text')
    await expect(question).toBeVisible()
    const text = await question.innerText()
    const value = solve(text)
    expect(value, `Pregunta no reconeguda: "${text}"`).toBeDefined()

    const answers = page.getByRole('group', { name: 'Respostes' })
    const wrongChoices = answers.getByRole('button').filter({ hasNotText: new RegExp(`^${value}$`) })
    await expect(wrongChoices).toHaveCount(3)
    const help = page.getByRole('region', { name: 'Ajuda' })

    for (let attempt = 1; attempt <= 3; attempt++) {
      const choice = wrongChoices.and(page.locator(':enabled')).first()
      await choice.click()
      await expect(help).toBeVisible()
      await expect(help.getByText('Gairebé! Mirem-ho junts')).toBeVisible()
      // Each wrong answer greys out only the tried bubble.
      await expect(answers.locator('button:disabled')).toHaveCount(attempt === 3 ? 4 : attempt)
    }

    // The solution is revealed and highlighted, never a "game over".
    await expect(answerButton(answers, value as string)).toHaveAttribute('aria-pressed', 'true')
    await expect(help.getByRole('button', { name: 'Continua' })).toBeVisible()
    await expect(page.getByText('Molt bé! ✨')).toBeHidden()

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(NEGATIVE_RE)

    // No red: tried bubbles are grey, the help banner is amber.
    const reds = await page.evaluate(() => {
      const isRed = (c: string): boolean => {
        const m = /rgba?\((\d+), (\d+), (\d+)/.exec(c)
        if (!m) return false
        const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])]
        return r > 170 && g < 90 && b < 90
      }
      return Array.from(document.querySelectorAll<HTMLElement>('main *'))
        .filter((el) => el.offsetParent !== null)
        .filter((el) => {
          const s = getComputedStyle(el)
          return isRed(s.backgroundColor) || isRed(s.color)
        })
        .map((el) => `${el.tagName}.${el.className}`.slice(0, 80))
    })
    expect(reds).toEqual([])

    // Continua moves on to a fresh item with no help shown.
    await help.getByRole('button', { name: 'Continua' }).click()
    await expect(help).toBeHidden()
    await expect(answers.locator('button:disabled')).toHaveCount(0)
    expect(consoleErrors).toEqual([])
  })
})
