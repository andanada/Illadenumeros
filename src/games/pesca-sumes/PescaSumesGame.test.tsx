import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatesDb } from '../../core/storage/db'
import { activateTestPlayer } from '../../test/playerDb'
import { NEGATIVE_WORDS } from '../shared/speed/negativeWords'
import { currentSum, seedLearningAddition } from '../shared/speed/speedTestUtils'
import { PescaSumesGame } from './PescaSumesGame'

let db: MatesDb
const onComplete = vi.fn()
const onExit = vi.fn()

const renderGame = (maxRounds?: number) =>
  render(
    <MemoryRouter>
      <PescaSumesGame skillIds={['A4']} {...(maxRounds ? { maxRounds } : {})} onExit={onExit} onComplete={onComplete} />
    </MemoryRouter>,
  )

const pond = () => screen.getByTestId('pond')
const fish = (value: string) => within(pond()).getByRole('button', { name: `Resposta ${value}` })

function mockReducedMotion(reduce: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }),
  )
}

const realNow = performance.now.bind(performance)
let skew = 0

/** Moves the game clock forward without waiting (the stopwatch reads performance.now). */
function fastForward(ms: number): void {
  skew += ms
}

beforeEach(async () => {
  skew = 0
  vi.spyOn(performance, 'now').mockImplementation(() => realNow() + skew)
  mockReducedMotion(false)
  db = activateTestPlayer()
  await Promise.all([db.skillStates.clear(), db.factStates.clear(), db.attempts.clear()])
  seedLearningAddition()
  onComplete.mockClear()
  onExit.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('PescaSumesGame', () => {
  it('shows the sum and fish carrying the answers, with a Pausa button', () => {
    renderGame()
    expect(currentSum().text).toMatch(/\+/)
    expect(pond()).toHaveAttribute('data-mode', 'moving')
    expect(within(pond()).getAllByRole('button').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByRole('button', { name: 'Pausa' })).toBeInTheDocument()
  })

  it('catching the right fish records the answer for this game', async () => {
    renderGame()
    await userEvent.click(fish(currentSum().answer))
    await waitFor(async () => expect(await db.attempts.count()).toBe(1))
    expect((await db.attempts.toArray())[0]).toMatchObject({ gameId: 'pesca-sumes', correct: true, hintsUsed: 0 })
  })

  it('a wrong fish fades and the sum waits, with kind words only', async () => {
    renderGame()
    const { answer, text } = currentSum()
    const wrong = within(pond()).getAllByRole('button').find((b) => b.getAttribute('aria-label') !== `Resposta ${answer}`)
    if (!wrong) throw new Error('no distractor')
    await userEvent.click(wrong)
    expect(await screen.findByText('Gairebé! Torna-ho a provar.')).toBeInTheDocument()
    expect(wrong).toBeDisabled()
    expect(currentSum().text).toBe(text)
    expect(document.body.textContent ?? '').not.toMatch(NEGATIVE_WORDS)
  })

  it('a fish that swims away costs nothing: no attempt is stored, the fact comes back later', async () => {
    renderGame()
    const first = currentSum().text
    fastForward(25_000)
    expect(await screen.findByText('Aquest peix tornarà més tard.', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(await db.attempts.count()).toBe(0)
    await waitFor(() => expect(currentSum().text).not.toBe(first))
    expect(document.body.textContent ?? '').not.toMatch(NEGATIVE_WORDS)
  })

  it('after three fish in a row swim away the pond calms down and nothing moves', async () => {
    renderGame()
    for (let i = 1; i <= 3; i++) {
      fastForward(25_000)
      await waitFor(() => expect(screen.getByTestId('speed-status')).toHaveTextContent('Aquest peix tornarà més tard.'), { timeout: 3000 })
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300))
      })
    }
    await waitFor(() => expect(pond()).toHaveAttribute('data-mode', 'calm'))
    expect(screen.getByText(/Els peixos s’han aturat/)).toBeInTheDocument()
  }, 20_000)

  it('prefers-reduced-motion: calm paced mode, no moving targets, fish never leave', async () => {
    mockReducedMotion(true)
    renderGame()
    expect(pond()).toHaveAttribute('data-mode', 'calm')
    expect(pond().querySelector('[style*="animation-name"]')).toBeNull()
    fastForward(60_000)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400))
    })
    expect(screen.queryByText('Aquest peix tornarà més tard.')).toBeNull()
    await userEvent.click(fish(currentSum().answer))
    await waitFor(async () => expect(await db.attempts.count()).toBe(1))
  })

  it('keyboard: typing the number catches the fish', async () => {
    renderGame()
    await userEvent.keyboard(currentSum().answer)
    await waitFor(async () => expect(await db.attempts.count()).toBe(1), { timeout: 3000 })
  })

  it('pause covers the question and Continuar resumes it', async () => {
    renderGame()
    const { text } = currentSum()
    await userEvent.click(screen.getByRole('button', { name: 'Pausa' }))
    expect(screen.getByRole('dialog', { name: 'Pausa' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(currentSum().text).toBe(text)
  })

  it('ends after the minimum of 8 catches with a kind summary', async () => {
    renderGame(3)
    for (let i = 0; i < 8; i++) {
      const { answer, text } = currentSum()
      await userEvent.click(fish(answer))
      if (i < 7) await waitFor(() => expect(currentSum().text).not.toBe(text), { timeout: 3000 })
    }
    const summary = await screen.findByTestId('speed-summary', {}, { timeout: 4000 })
    expect(summary).toHaveTextContent('Quina bona pesca!')
    await userEvent.click(screen.getByRole('button', { name: 'Continua' }))
    expect(onComplete.mock.calls[0]?.[0]).toMatchObject({ answered: 8 })
  }, 40_000)
})
