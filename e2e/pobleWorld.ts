import type { Browser, Locator, Page } from '@playwright/test'
import { matesAmbit } from '../src/ambits/mates'
import { MATES_SKILLS } from '../src/ambits/mates/skills'
import { CHILD, completeDiagnostic, createProfile, expect, playerDbNames, test as base } from './helpers'

type StorageState = Awaited<ReturnType<Awaited<ReturnType<Browser['newContext']>>['storageState']>>

/** A profile that finished the first day, created once per worker through the UI. */
export const townTest = base.extend<object, { townState: StorageState }>({
  townState: [
    async ({ browser }, use, workerInfo) => {
      const baseURL = workerInfo.project.use.baseURL
      if (!baseURL) throw new Error('Falta baseURL a la configuració de Playwright')
      const context = await browser.newContext({ baseURL })
      context.setDefaultTimeout(15_000)
      try {
        const page = await context.newPage()
        await createProfile(page)
        await completeDiagnostic(page)
        await expect(page.getByTestId('street')).toBeVisible()
        await use(await context.storageState({ indexedDB: true }))
      } finally {
        await context.close().catch(() => undefined)
      }
    },
    { scope: 'worker', timeout: 120_000 },
  ],
  storageState: async ({ townState }, use) => {
    await use(townState)
  },
})

const SHOTS = process.env.POBLE_SHOTS

export async function shot(page: Page, name: string, project: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: false })
}

/** What a mastered fact skill needs on disk so the app keeps it «dominada»: automatised facts and clean days. */
function retentionRows(ids: readonly string[]): { facts: unknown[]; attempts: unknown[] } {
  const now = Date.now()
  const day = 86_400_000
  const fact = MATES_SKILLS.filter((s) => ids.includes(s.id) && s.operation !== undefined && s.hasFacts)
  const facts = fact.flatMap((s) =>
    matesAmbit.factsForSkill(s.id).map((factKey) => ({ factKey, box: 5, streak: 6, attempts: 8, correct: 8, recentRts: [1400, 1500, 1300], lastSeen: now, dueAt: now + day })),
  )
  const attempts = fact.flatMap((s) =>
    [1, 2, 3, 4].map((d) => ({ id: `seed-${s.id}-${d}`, ambitId: 'mates', skillId: s.id, correct: true, rtMs: 1500, hintsUsed: 0, cpaStage: 'abstracte', gameId: 'repte-illa', sessionId: `seed-${d}`, createdAt: now - d * day })),
  )
  return { facts, attempts }
}

/** Writes skill states (plus the facts and clean days that keep mastered ones mastered) into the player's database. */
export async function seedSkills(page: Page, states: Readonly<Record<string, 'aprenent' | 'consolidant' | 'dominada'>>): Promise<void> {
  const dbName = (await playerDbNames(page))[CHILD.name]
  if (!dbName) throw new Error('No hi ha base de dades del jugador')
  const done = Object.entries(states).filter(([, st]) => st === 'dominada').map(([id]) => id)
  const { facts, attempts } = retentionRows(done)
  await page.evaluate(
    async ({ name, list, factRows, attemptRows }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(name)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const tx = database.transaction(['skillStates', 'factStates', 'attempts'], 'readwrite')
      for (const [skillId, status] of Object.entries(list)) {
        tx.objectStore('skillStates').put({
          skillId,
          accuracy: 0.9,
          fluency: 0.5,
          mastery: status === 'dominada' ? 0.95 : 0.7,
          status,
          cpaStage: 'abstracte',
          attempts: 14,
          correct: 12,
          sessions: ['s1', 's2', 's3'],
          recent: [true, true, true],
          consecutiveErrors: 0,
          updatedAt: Date.now(),
        })
      }
      for (const row of factRows) tx.objectStore('factStates').put(row)
      for (const row of attemptRows) tx.objectStore('attempts').put(row)
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      database.close()
    },
    { name: dbName, list: states, factRows: facts, attemptRows: attempts },
  )
}

const mastered = (ids: readonly string[]): Record<string, 'dominada'> => Object.fromEntries(ids.map((id) => [id, 'dominada' as const]))

const EARLY = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'C1', 'C2', 'C3']
const FOURTH = ['C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9']

/** Multiplication has started: the farm opens. */
export const MULTIPLYING: Readonly<Record<string, 'aprenent' | 'dominada'>> = { ...mastered(EARLY), C4: 'aprenent' }
/** Fourth grade learnt: the fifth-grade region (and the market) opens. */
export const FIFTH_GRADE: Readonly<Record<string, 'dominada'>> = mastered([...EARLY, ...FOURTH])

export const actor = (page: Page, id: string): Locator => page.locator(`[data-actor="${id}"]`)

export async function enterStreetPlace(page: Page, name: RegExp): Promise<void> {
  await page.goto('/#/poble')
  await expect(page.getByTestId('street')).toBeVisible()
  await page.getByRole('button', { name }).click()
}

/** Carries one loose thing of a def into the zone with tap-select + tap-target, and waits until her hands are free again. */
export async function carry(page: Page, def: string, zoneName: string | RegExp): Promise<void> {
  await page.locator(`[data-def="${def}"]:not([data-in])`).last().click()
  await page.getByRole('button', { name: zoneName }).click()
  await expect(actor(page, 'laia')).not.toHaveAccessibleName(/porta/, { timeout: 30_000 })
}

/** Writes today's allotment into the player's database (the old board key, migrated by the requests system). */
export async function seedBoard(page: Page, tasks: readonly Record<string, unknown>[]): Promise<void> {
  const dbName = (await playerDbNames(page))[CHILD.name]
  if (!dbName) throw new Error('No hi ha base de dades del jugador')
  await page.evaluate(
    async ({ name, list }) => {
      const value = { day: new Date().toLocaleDateString('sv-SE'), tasks: list, done: {} }
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(name)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const tx = database.transaction('meta', 'readwrite')
      tx.objectStore('meta').put({ key: 'errandBoard', value })
      tx.objectStore('meta').delete('dailyRequests')
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      database.close()
    },
    { name: dbName, list: tasks },
  )
}
