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

beforeEach(() => {
  db = activateTestPlayer()
  resetWorldStoreForTest()
})
afterEach(() => vi.unstubAllGlobals())

const request = (): string => screen.getByTestId('errand-request').textContent ?? ''

/** A request the engine plays at once (tests fix the skill): the grandma's bubble opened. */
function renderRequest(skillId: string, onSolved = vi.fn()) {
  render(<CasaPlace pending={1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} forced={{ skillId }} />)
  return onSolved
}

const jar = (stage: HTMLElement): HTMLElement => {
  const el = stage.querySelector<HTMLElement>('[data-prop-kind="ingredient-pot"]')
  if (!el) throw new Error('Sense pot')
  return el
}

async function carryInto(stage: HTMLElement, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await userEvent.click(jar(stage))
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho al bol' }))
  }
}

describe('Casa: the family’s requests, answered by carrying things into the bowl', () => {
  it('the grandma asks for strawberries; putting them in one by one solves it: attempt, coins, cheer', async () => {
    const onSolved = renderRequest('A8')
    const stage = await screen.findByRole('region', { name: 'Encàrrec a la Casa: la iaia' })
    expect(stage).toHaveAttribute('data-errand-kind', 'bol-maduixa')
    expect(request()).toMatch(/maduixes/)
    const m = /: (\d+) \+ (\d+) /.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const total = Number(m[1]) + Number(m[2])
    await carryInto(stage, total)
    expect(screen.getByRole('img', { name: new RegExp(`^Bol: ${total} maduixes`) })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    const attempts = await db.attempts.toArray()
    expect(attempts).toHaveLength(1)
    expect(attempts[0]).toMatchObject({ gameId: 'poble-casa', skillId: 'A8', correct: true, hintsUsed: 0 })
    expect(useProgress.getState().rewards.petals).toBe(3)
    expect(screen.getByTestId('errand-request')).toHaveTextContent(/Moltes gràcies!.*3 monedes/)
    expect(screen.getByTestId('errand-neighbour')).toHaveAttribute('data-pose', 'cheer')
    await userEvent.click(screen.getByRole('button', { name: 'Adéu!' }))
    expect(screen.queryByRole('region', { name: /^Encàrrec a la Casa/ })).toBeNull()
  })

  it('a friends-of-ten request starts with some in the bowl and only the missing ones are carried', async () => {
    const onSolved = renderRequest('A5')
    const stage = await screen.findByRole('region', { name: /^Encàrrec a la Casa/ })
    const m = /ja n’hi ha (\d+): \d+ \+ \? = (\d+)/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    expect(screen.getByRole('img', { name: new RegExp(`^Bol: ${m[1]} `) })).toBeInTheDocument()
    await carryInto(stage, Number(m[2]) - Number(m[1]))
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect((await db.attempts.toArray())[0]).toMatchObject({ skillId: 'A5', correct: true })
  })

  it('a wrong bowl bounces gently with a hint, and a helped answer is not clean', async () => {
    const onSolved = renderRequest('A4')
    const stage = await screen.findByRole('region', { name: /^Encàrrec a la Casa/ })
    await carryInto(stage, 1)
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    expect((await screen.findByTestId('errand-hint')).textContent?.length).toBeGreaterThan(0)
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    expect(onSolved).not.toHaveBeenCalled()
    const m = /: (\d+) \+ (\d+) /.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    await carryInto(stage, Number(m[1]) + Number(m[2]) - 1)
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(1))
    const attempts = await db.attempts.toArray()
    expect(attempts.map((a) => a.correct).sort()).toEqual([false, true])
    expect(attempts.find((a) => a.correct)?.hintsUsed).toBeGreaterThan(0)
  })

  it('"Ajuda" says the hint, and "Ara no" lets it be without recording anything (ignoring is fine)', async () => {
    renderRequest('A7')
    await screen.findByRole('region', { name: /^Encàrrec a la Casa/ })
    await userEvent.click(screen.getByRole('button', { name: 'Ajuda' }))
    expect((await screen.findByTestId('errand-hint')).textContent?.length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
    expect(screen.queryByRole('region', { name: /^Encàrrec a la Casa/ })).toBeNull()
  })

  it('the person who asks is named in the region and shown', async () => {
    renderRequest('A4')
    const stage = await screen.findByRole('region', { name: 'Encàrrec a la Casa: la iaia' })
    expect(within(stage).getByRole('img', { name: 'la iaia' })).toBeInTheDocument()
  })
})
