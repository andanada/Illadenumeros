import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import { resetWorldStoreForTest } from '../../data/worldStore'
import CasaPlace from './CasaPlace'

// Many taps per test: a loaded machine (the whole suite in parallel) needs more than the default 5 s.
vi.setConfig({ testTimeout: 30_000 })

let db: MatesDb

function mockReducedMotion(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }))
}

beforeEach(() => {
  db = activateTestPlayer()
  resetWorldStoreForTest()
  mockReducedMotion()
})
afterEach(() => vi.unstubAllGlobals())

const request = (): string => screen.getByTestId('errand-request').textContent ?? ''
const FRAME = '[data-zone="peticio-casa"]'

const q = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel)
  if (!el) throw new Error(`Sense ${sel}`)
  return el
}
/** The things of the pile: lying loose, not in the frame. */
const pile = (def: string): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>(`[data-def="${def}"]`)).filter((e) => !e.hasAttribute('data-in'))
const inFrame = (): number => Number(q(FRAME).getAttribute('data-count'))

/** A request the engine plays at once (tests fix the skill): the grandma's strawberries. */
function renderRequest(skillId: string, onSolved = vi.fn()) {
  render(<CasaPlace pending={1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} forced={{ skillId }} />)
  return onSolved
}

/** Carry one thing from the pile into the frame with tap-to-select, then tap-the-frame. */
async function carryOne(): Promise<void> {
  const piece = pile('casa-maduixa')[0]
  if (!piece) throw new Error('La pila és buida')
  const before = inFrame()
  await userEvent.click(piece)
  await userEvent.click(await screen.findByRole('button', { name: 'Deixa-ho al bol' }))
  await waitFor(() => expect(inFrame()).toBe(before + 1))
}

async function carry(n: number): Promise<void> {
  for (let i = 0; i < n; i++) await carryOne()
}

const sums = (): { total: number } => {
  const m = /: (\d+) \+ (\d+) /.exec(request())
  if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
  return { total: Number(m[1]) + Number(m[2]) }
}

describe('Casa: the family’s requests are done in the house, with the things themselves', () => {
  it('the grandma asks for strawberries: they lie in a pile, are carried into the bowl and handed over: attempt, coins, cheer', async () => {
    const onSolved = renderRequest('A8')
    const card = await screen.findByRole('region', { name: 'Encàrrec a la Casa: la iaia' })
    expect(card).toHaveAttribute('data-errand-kind', 'bol-maduixa')
    expect(request()).toMatch(/maduixes/)
    const { total } = sums()
    await waitFor(() => expect(pile('casa-maduixa').length).toBe(total + 2))
    expect(within(card).queryByRole('button', { name: /Ja està/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Dóna-ho a la iaia' })).toBeDisabled()
    await carry(total)
    expect(screen.getByRole('group', { name: 'el bol' })).toHaveAttribute('data-count', String(total))
    await userEvent.click(screen.getByRole('button', { name: 'Dóna-ho a la iaia' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    const attempts = await db.attempts.toArray()
    expect(attempts).toHaveLength(1)
    expect(attempts[0]).toMatchObject({ gameId: 'poble-casa', skillId: 'A8', correct: true, hintsUsed: 0 })
    expect(useProgress.getState().rewards.petals).toBe(3)
    expect(screen.getByTestId('errand-request')).toHaveTextContent(/Moltes gràcies!.*3 monedes/)
    // The bowl is given away: nothing is left in it.
    await waitFor(() => expect(document.querySelectorAll('[data-in="peticio-casa"]')).toHaveLength(0))
    await userEvent.click(screen.getByRole('button', { name: 'Adéu!' }))
    expect(screen.queryByRole('region', { name: /^Encàrrec a la Casa/ })).toBeNull()
    expect(pile('casa-maduixa')).toHaveLength(0)
  })

  it('«ja n’hi ha 6, calen 10»: six lie in the bowl from the start and only the missing ones are carried', async () => {
    const onSolved = renderRequest('A5')
    await screen.findByRole('region', { name: /^Encàrrec a la Casa/ })
    const m = /ja n’hi ha (\d+): \d+ \+ \? = (\d+)/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const have = Number(m[1])
    await waitFor(() => expect(document.querySelectorAll('[data-def="casa-maduixa-ja"]')).toHaveLength(have))
    expect(inFrame()).toBe(have)
    // What was already there cannot be taken out again.
    await userEvent.click(q('[data-def="casa-maduixa-ja"]'))
    expect(inFrame()).toBe(have)
    await carry(Number(m[2]) - have)
    await userEvent.click(screen.getByRole('button', { name: 'Dóna-ho a la iaia' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect((await db.attempts.toArray())[0]).toMatchObject({ skillId: 'A5', correct: true })
  })

  it('a wrong bowl sends everything gently back to the pile with a hint (no red), and a helped answer is not clean', async () => {
    const onSolved = renderRequest('A4')
    await screen.findByRole('region', { name: /^Encàrrec a la Casa/ })
    const { total } = sums()
    await waitFor(() => expect(pile('casa-maduixa').length).toBe(total + 2))
    await carry(1)
    await userEvent.click(screen.getByRole('button', { name: 'Dóna-ho a la iaia' }))
    expect((await screen.findByTestId('errand-hint')).textContent?.length).toBeGreaterThan(0)
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    expect(onSolved).not.toHaveBeenCalled()
    await waitFor(() => expect(inFrame()).toBe(0))
    await waitFor(() => expect(pile('casa-maduixa').length).toBe(total + 2))
    await carry(total)
    await userEvent.click(screen.getByRole('button', { name: 'Dóna-ho a la iaia' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(1))
    const attempts = await db.attempts.toArray()
    expect(attempts.map((a) => a.correct).sort()).toEqual([false, true])
    expect(attempts.find((a) => a.correct)?.hintsUsed).toBeGreaterThan(0)
  })

  it('the keyboard does it all: Enter on a piece picks it up, Enter on the bowl puts it in; aria-live says so in Catalan', async () => {
    renderRequest('A4')
    await screen.findByRole('region', { name: /^Encàrrec a la Casa/ })
    const piece = pile('casa-maduixa')[0]
    if (!piece) throw new Error('Sense pila')
    piece.focus()
    await userEvent.keyboard('{Enter}')
    const drop = await screen.findByRole('button', { name: 'Deixa-ho al bol' })
    drop.focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(inFrame()).toBe(1))
    const live = Array.from(document.querySelectorAll('[role="status"][aria-live="polite"]')).map((e) => e.textContent ?? '')
    expect(live.some((t) => /Has posat una maduixa al bol: ara hi ha 1\./.test(t))).toBe(true)
  })

  it('the pieces of the pile are big enough to touch', async () => {
    renderRequest('A4')
    await screen.findByRole('region', { name: /^Encàrrec a la Casa/ })
    await waitFor(() => expect(pile('casa-maduixa').length).toBeGreaterThan(0))
    for (const p of pile('casa-maduixa')) expect(Number.parseFloat(p.style.width)).toBeGreaterThanOrEqual(64)
  })

  it('"Ajuda" says the hint, and "Ara no" lets it be without recording anything and tidies the pile (ignoring is fine)', async () => {
    renderRequest('A7')
    await screen.findByRole('region', { name: /^Encàrrec a la Casa/ })
    await waitFor(() => expect(pile('casa-maduixa').length).toBeGreaterThan(0))
    await carry(1)
    await userEvent.click(screen.getByRole('button', { name: 'Ajuda' }))
    expect((await screen.findByTestId('errand-hint')).textContent?.length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
    expect(screen.queryByRole('region', { name: /^Encàrrec a la Casa/ })).toBeNull()
    await waitFor(() => expect(document.querySelectorAll('[data-def^="casa-"]')).toHaveLength(0))
  })

  it('the person who asks is named in the region', async () => {
    renderRequest('A4')
    expect(await screen.findByRole('region', { name: 'Encàrrec a la Casa: la iaia' })).toBeInTheDocument()
  })
})
