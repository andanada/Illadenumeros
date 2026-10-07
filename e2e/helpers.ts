import { test as base, expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test'

/** Shape returned by `context.storageState()`; reused as the `storageState` option. */
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>

export const CHILD = { name: 'Laia', character: 'Nyx', color: 'Rosa', theme: 'rosa' } as const

/** Anything that looks like a score, a grade or a counter of mistakes. The app must never show it to the child. */
export const SCORE_RE = /\bpunts?\b|puntuaci[óo]|\bnota\b|\d+\s*\/\s*\d+|\d+\s*%|\bencerts?\b|\berrors?\b|\bvides?\b/i

/** Words that would make a mistake feel like a punishment. */
export const NEGATIVE_RE = /\bmalament\b|\bincorrect[ea]?\b|\berror\b|\bvides?\b|\bvida\b|has perdut|\bfallat\b/i

const MINUS = /[−-]/

/**
 * Solves the arithmetic items the app shows as text.
 * Supports `a × b = ?`, `a : b = ?`, the 3rd-grade multiplication word items, `a + b = ?`, `a − b = ?`, `a + ? = t`, `? + k = t`, `t = p + ?` and the comparison `a ? b`.
 * Returns undefined for visual-only items ("Quants n’hi ha?", place value, number line).
 */
export function solve(rawText: string): string | undefined {
  const text = rawText.replace(/\s+/g, ' ').trim()
  let m = /^(\d+) \+ (\d+) = \?$/.exec(text)
  if (m) return String(Number(m[1]) + Number(m[2]))
  m = new RegExp(`^(\\d+) ${MINUS.source} (\\d+) = \\?$`).exec(text)
  if (m) return String(Number(m[1]) - Number(m[2]))
  m = /^(\d+) \+ \? = (\d+)$/.exec(text)
  if (m) return String(Number(m[2]) - Number(m[1]))
  m = /^\? \+ (\d+) = (\d+)$/.exec(text)
  if (m) return String(Number(m[2]) - Number(m[1]))
  m = /^(\d+) = (\d+) \+ \?$/.exec(text)
  if (m) return String(Number(m[1]) - Number(m[2]))
  m = /^(\d+) × (\d+) = \?$/.exec(text)
  if (m) return String(Number(m[1]) * Number(m[2]))
  m = /^(\d+) : (\d+) = \?$/.exec(text)
  if (m && Number(m[2]) > 0) return String(Number(m[1]) / Number(m[2]))
  m = /^(\d+) vegades (\d+):/.exec(text)
  if (m) return String(Number(m[1]) * Number(m[2]))
  m = /^Hi ha (\d+) files amb (\d+)/.exec(text)
  if (m) return String(Number(m[1]) * Number(m[2]))
  m = /^(\d+) \? (\d+)$/.exec(text)
  if (m) {
    const left = Number(m[1])
    const right = Number(m[2])
    return left < right ? '<' : left > right ? '>' : '='
  }
  return undefined
}

/** Answer bubble by exact value (`Resposta 8` must not match `Resposta 18`). */
export const answerButton = (scope: Page | Locator, value: string): Locator =>
  scope.getByRole('button', { name: `Resposta ${value}`, exact: true })

/** Feedback bubble at the bottom of the mini-games. */
export const feedbackStatus = (page: Page): Locator => page.locator('main p[role="status"]')

export const themeOf = (page: Page): Promise<string | undefined> => page.evaluate(() => document.documentElement.dataset.theme)

/** From `/` through the start screen and the 4 onboarding steps, ending on the diagnostic. */
export async function createProfile(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page).toHaveURL(/#\/start$/)
  await page.getByRole('button', { name: 'Toca per començar' }).click()
  await expect(page).toHaveURL(/#\/onboarding$/)

  await page.getByLabel('Com et dius?').fill(CHILD.name)
  await page.getByRole('button', { name: 'Continua' }).click()

  const characters = page.getByRole('radiogroup', { name: 'Personatge preferit' })
  await expect(characters).toBeVisible()
  await characters.getByRole('radio', { name: CHILD.character }).click()
  await expect(characters.getByRole('radio', { name: CHILD.character })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Continua' }).click()

  const colors = page.getByRole('radiogroup', { name: 'Color preferit' })
  await expect(colors).toBeVisible()
  await colors.getByRole('radio', { name: CHILD.color }).click()
  await expect.poll(() => themeOf(page)).toBe(CHILD.theme)
  await page.getByRole('button', { name: 'Continua' }).click()

  await expect(page.getByText(CHILD.name, { exact: false }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Som-hi!' }).click()
  await expect(page).toHaveURL(/#\/diagnostic$/)
}

export interface DiagnosticRun {
  questions: string[]
  scoreLeaks: string[]
}

const MAX_DIAGNOSTIC_QUESTIONS = 40
const CLICK_TIMEOUT_MS = 5_000

/** Answers every diagnostic item correctly until the map shows. Records any score-like text seen. */
export async function completeDiagnostic(page: Page): Promise<DiagnosticRun> {
  const answers = page.getByRole('group', { name: 'Respostes' })
  const celebrate = page.getByRole('button', { name: 'Veure el mapa' })
  const stepMsg = page.getByText('Un pas d’exploració!')
  const question = page.getByRole('heading', { level: 2 })
  const run: DiagnosticRun = { questions: [], scoreLeaks: [] }

  const checkNoScore = async (): Promise<void> => {
    const text = await page.locator('body').innerText()
    const leak = SCORE_RE.exec(text)
    if (leak) run.scoreLeaks.push(leak[0])
  }

  for (let i = 0; i < MAX_DIAGNOSTIC_QUESTIONS; i++) {
    await expect(answers.or(celebrate).first()).toBeVisible()
    if (await celebrate.isVisible()) break
    const text = await question.innerText()
    const value = solve(text)
    if (value === undefined) throw new Error(`Pregunta del diagnòstic no reconeguda: "${text}"`)
    await checkNoScore()
    // If the item vanished before the tap (e.g. the dev server reloaded the page after
    // re-optimising dependencies), read the question again instead of waiting forever.
    const clicked = await answerButton(answers, value)
      .click({ timeout: CLICK_TIMEOUT_MS })
      .then(() => true, () => false)
    if (!clicked) continue
    run.questions.push(text)
    await expect(stepMsg.or(celebrate).first()).toBeVisible()
    await checkNoScore()
    await expect(stepMsg).toBeHidden()
  }

  await expect(celebrate).toBeVisible()
  await checkNoScore()
  await celebrate.click()
  await expect(page).toHaveURL(/#\/map$/)
  return run
}

/** Creates a fresh, fully onboarded profile in a throwaway context and returns its storage (incl. IndexedDB). */
async function buildSeededState(browser: Browser, baseURL: string): Promise<StorageState> {
  const context = await browser.newContext({ baseURL })
  context.setDefaultTimeout(15_000)
  try {
    const page = await context.newPage()
    await createProfile(page)
    await completeDiagnostic(page)
    await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    return await context.storageState({ indexedDB: true })
  } finally {
    await context.close()
  }
}

interface TestFixtures {
  /** Console errors and uncaught page errors seen during the test. */
  consoleErrors: string[]
}

interface WorkerFixtures {
  seededState: StorageState
}

/** Base test: collects console errors for every test and attaches them on failure. */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  consoleErrors: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
      })
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
      await use(errors)
      if (errors.length > 0) await testInfo.attach('console-errors', { body: errors.join('\n'), contentType: 'text/plain' })
    },
    { auto: true },
  ],
  seededState: [
    async ({ browser }, use, workerInfo) => {
      const baseURL = workerInfo.project.use.baseURL
      if (!baseURL) throw new Error('Falta baseURL a la configuració de Playwright')
      await use(await buildSeededState(browser, baseURL))
    },
    { scope: 'worker', timeout: 120_000 },
  ],
})

/** Test that starts with the shared onboarded profile (created once per worker through the UI). */
export const seededTest = test.extend({
  storageState: async ({ seededState }, use) => {
    await use(seededState)
  },
})

export { expect }

/** True when the document can be scrolled sideways. */
export const hasHorizontalScroll = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement
    return el.scrollWidth > window.innerWidth
  })

/** Visible buttons shorter than `min` px, described by their accessible name. */
export async function smallButtons(page: Page, min: number): Promise<string[]> {
  const buttons = page.locator('button:visible')
  const count = await buttons.count()
  const small: string[] = []
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i)
    const box = await button.boundingBox()
    if (box && box.height < min) {
      const name = (await button.getAttribute('aria-label')) ?? (await button.innerText()).trim()
      small.push(`${name} (${Math.round(box.height)}px)`)
    }
  }
  return small
}
