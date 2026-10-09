import type { Page } from '@playwright/test'
import { expect, hasHorizontalScroll, seededTest as test, smallButtons } from './helpers'

const MIN_TOUCH_PX = 44

const SCREENS: { name: string; hash: string; ready: (page: Page) => Promise<void> }[] = [
  {
    name: 'el poble',
    hash: '#/poble',
    ready: (page) => expect(page.getByTestId('street')).toBeVisible(),
  },
  {
    name: 'mapa d’illes',
    hash: '#/illes',
    ready: (page) => expect(page.getByRole('button', { name: /Missió d’avui/ })).toBeVisible(),
  },
  {
    name: 'Repte de l’Illa',
    hash: '#/play/repte-illa',
    ready: (page) => expect(page.getByTestId('question-text')).toBeVisible(),
  },
  {
    name: 'Cursa a la Recta',
    hash: '#/play/cursa-recta',
    ready: (page) => expect(page.getByRole('group', { name: /^(Salts|Respostes)$/ }).first()).toBeVisible(),
  },
  {
    name: 'Missió',
    hash: '#/mission',
    ready: (page) => expect(page.getByRole('list', { name: /^Missió: 0 de 4 fets$/ })).toBeVisible(),
  },
]

test.describe('Mòbil vertical: tàctil i sense scroll horitzontal', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-portrait', 'Només per al viewport de mòbil vertical')
  })

  for (const screen of SCREENS) {
    test(`${screen.name}: cap scroll horitzontal i botons >= ${MIN_TOUCH_PX}px`, async ({ page }) => {
      await page.goto(`/${screen.hash}`)
      await screen.ready(page)
      expect(await hasHorizontalScroll(page), 'scrollWidth > innerWidth').toBe(false)
      // Polling lets the entrance springs (scale from 0.6) settle; a button that stays small fails.
      await expect.poll(() => smallButtons(page, MIN_TOUCH_PX), { message: 'Botons massa petits' }).toEqual([])
      expect(await hasHorizontalScroll(page), 'scrollWidth > innerWidth').toBe(false)
    })
  }

  test('cap element visible queda tallat fora de la pantalla al mapa', async ({ page }) => {
    await page.goto('/#/illes')
    await expect(page.getByRole('button', { name: /Missió d’avui/ })).toBeVisible()
    const offscreen = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('button, h1, h2'))
        .filter((el) => el.offsetParent !== null)
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.right > window.innerWidth + 1 || r.left < -1
        })
        .map((el) => `${el.tagName} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}"`),
    )
    expect(offscreen, `Elements tallats: ${offscreen.join(', ')}`).toEqual([])
  })
})
