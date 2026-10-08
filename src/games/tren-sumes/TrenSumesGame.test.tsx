import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NEGATIVE_WORDS } from '../shared/speed/negativeWords'
import { currentSum, seedLearningAddition } from '../shared/speed/speedTestUtils'
import { activateTestPlayer } from '../../test/playerDb'
import type { MatesDb } from '../../core/storage/db'
import { TrenSumesGame } from './TrenSumesGame'

let db: MatesDb
const onComplete = vi.fn()
const onExit = vi.fn()

const renderGame = (maxRounds?: number) =>
  render(
    <MemoryRouter>
      <TrenSumesGame skillIds={['A4']} {...(maxRounds ? { maxRounds } : {})} onExit={onExit} onComplete={onComplete} />
    </MemoryRouter>,
  )

const answers = () => screen.getByRole('group', { name: 'Respostes' })

beforeEach(async () => {
  db = activateTestPlayer()
  await Promise.all([db.skillStates.clear(), db.factStates.clear(), db.attempts.clear()])
  seedLearningAddition()
  onComplete.mockClear()
  onExit.mockClear()
})

describe('TrenSumesGame', () => {
  it('shows a sum, answer bubbles, the rhythm ribbon and a clear Pausa button', () => {
    renderGame()
    expect(currentSum().text).toMatch(/\+/)
    expect(within(answers()).getAllByRole('button').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByTestId('pace-bar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pausa' })).toBeInTheDocument()
  })

  it('records a right answer through the normal flow (attempt stored for this game)', async () => {
    renderGame()
    const { answer } = currentSum()
    await userEvent.click(within(answers()).getByRole('button', { name: `Resposta ${answer}` }))
    await waitFor(async () => expect(await db.attempts.count()).toBe(1))
    const row = (await db.attempts.toArray())[0]
    expect(row?.gameId).toBe('tren-sumes')
    expect(row?.correct).toBe(true)
    expect(row?.hintsUsed).toBe(0)
  })

  it('a wrong answer is gentle: the bubble fades, the question waits, no negative words', async () => {
    renderGame()
    const { answer, text } = currentSum()
    const wrong = within(answers()).getAllByRole('button').find((b) => b.getAttribute('aria-label') !== `Resposta ${answer}`)
    if (!wrong) throw new Error('no distractor')
    await userEvent.click(wrong)
    expect(await screen.findByText('Gairebé! Torna-ho a provar.')).toBeInTheDocument()
    expect(wrong).toBeDisabled()
    expect(currentSum().text).toBe(text)
    expect(document.body.textContent ?? '').not.toMatch(NEGATIVE_WORDS)
    // A helped answer is stored with a hint, so it never counts as clean.
    await userEvent.click(within(answers()).getByRole('button', { name: `Resposta ${answer}` }))
    await waitFor(async () => expect(await db.attempts.count()).toBe(2))
    const rows = await db.attempts.toArray()
    expect(rows.some((r) => r.correct && r.hintsUsed > 0)).toBe(true)
  })

  it('pause hides the question and resumes where it stopped', async () => {
    renderGame()
    const { text } = currentSum()
    await userEvent.click(screen.getByRole('button', { name: 'Pausa' }))
    expect(screen.getByRole('dialog', { name: 'Pausa' })).toBeInTheDocument()
    expect(screen.getByTestId('speed-question')).toHaveTextContent('…')
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(currentSum().text).toBe(text)
  })

  it('can be played with the keyboard: typing the number answers', async () => {
    renderGame()
    const { answer } = currentSum()
    await userEvent.keyboard(answer)
    await waitFor(async () => expect(await db.attempts.count()).toBe(1), { timeout: 3000 })
  })

  it('reaches the station after the minimum of 8 questions and ends with a kind summary', async () => {
    renderGame(3)
    for (let i = 0; i < 8; i++) {
      const { answer, text } = currentSum()
      await userEvent.click(within(answers()).getByRole('button', { name: `Resposta ${answer}` }))
      if (i < 7) await waitFor(() => expect(currentSum().text).not.toBe(text), { timeout: 3000 })
    }
    const summary = await screen.findByTestId('speed-summary', {}, { timeout: 4000 })
    expect(summary).toHaveTextContent('El tren ha arribat a l’estació!')
    expect(summary.textContent ?? '').not.toMatch(NEGATIVE_WORDS)
    await userEvent.click(screen.getByRole('button', { name: 'Continua' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0]?.[0]).toMatchObject({ answered: 8 })
  }, 40_000)
})
