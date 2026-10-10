import { configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatesDb } from '../../../core/storage/db'
import { seedLearningAddition } from '../../../games/shared/speed/speedTestUtils'
import { activateTestPlayer } from '../../../test/playerDb'
import RecreatiusPlace from './RecreatiusPlace'

// Component tests are slow when the whole suite runs under coverage: wait longer before giving up.
vi.setConfig({ testTimeout: 20_000 })
configure({ asyncUtilTimeout: 5000 })

let db: MatesDb

/** Reduced motion: she reaches a cabinet at once instead of walking there frame by frame. */
function mockReducedMotion(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  }))
}

afterEach(() => vi.unstubAllGlobals())

beforeEach(async () => {
  mockReducedMotion()
  db = activateTestPlayer()
  await Promise.all([db.skillStates.clear(), db.factStates.clear(), db.attempts.clear()])
  seedLearningAddition()
})

/** Solves the facts the duel can ask at the start: "3 + 5 = ?", "8 + ? = 10", "10 − 4 = ?". */
function solve(text: string): string {
  const missing = /^(\d+) \+ \? = (\d+)$/.exec(text)
  if (missing) return String(Number(missing[2]) - Number(missing[1]))
  const m = /^(\d+) ([+−]) (\d+) = \?$/.exec(text)
  if (!m) throw new Error(`Pregunta inesperada: ${text}`)
  return String(m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]))
}

const renderRoom = () =>
  render(
    <MemoryRouter>
      <RecreatiusPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />
    </MemoryRouter>,
  )

/** The real games run inside the cabinet's screen, unchanged: each one records under its own game id. */
describe('Recreatius cabinets run the real speed games', () => {
  it('Tren de Sumes records a clean answer under tren-sumes, in a framed (embedded) screen', async () => {
    renderRoom()
    await userEvent.click(screen.getByRole('button', { name: 'Tren de Sumes: juga' }))
    const screenFrame = await screen.findByTestId('cabinet-screen')
    await screen.findByTestId('speed-question')
    expect(screenFrame.querySelector('[data-embedded-screen="true"]')).not.toBeNull()
    expect(screenFrame.querySelector('.notebook')).toBeNull()
    const answer = solve((screen.getByTestId('speed-question').textContent ?? '').trim())
    await userEvent.click(within(screen.getByRole('group', { name: 'Respostes' })).getByRole('button', { name: `Resposta ${answer}` }))
    await waitFor(async () => expect(await db.attempts.count()).toBe(1))
    expect((await db.attempts.toArray())[0]).toMatchObject({ gameId: 'tren-sumes', correct: true, hintsUsed: 0 })
  })

  it('Pesca de Sumes records under pesca-sumes (calm mode keeps the fish still enough to tap)', async () => {
    renderRoom()
    await userEvent.click(screen.getByRole('button', { name: 'Pesca de Sumes: juga' }))
    await screen.findByTestId('speed-question')
    const answer = solve((screen.getByTestId('speed-question').textContent ?? '').trim())
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(`${answer}$`) }))
    await waitFor(async () => expect(await db.attempts.count()).toBe(1))
    expect((await db.attempts.toArray())[0]).toMatchObject({ gameId: 'pesca-sumes', correct: true })
  })

  it('Duel Llampec records under duel-llampec', async () => {
    renderRoom()
    await userEvent.click(screen.getByRole('button', { name: 'Duel Llampec: juga' }))
    const question = await screen.findByTestId('duel-question')
    const text = (question.textContent ?? '').trim()
    const answer = solve(text)
    await userEvent.click(within(screen.getByRole('group', { name: 'Respostes' })).getByRole('button', { name: `Resposta ${answer}` }))
    await waitFor(async () => expect(await db.attempts.count()).toBe(1))
    expect((await db.attempts.toArray())[0]).toMatchObject({ gameId: 'duel-llampec', correct: true })
  })

  it('leaving a cabinet with its «Enrere» button returns to the room', async () => {
    renderRoom()
    await userEvent.click(screen.getByRole('button', { name: 'Tren de Sumes: juga' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Enrere' }))
    expect(screen.getByRole('button', { name: 'Tren de Sumes: juga' })).toBeInTheDocument()
  })
})
