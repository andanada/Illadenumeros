import { configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameProps } from '../../../features/play/gameTypes'
import { activateTestPlayer } from '../../../test/playerDb'
import { place } from './index'
import RecreatiusPlace from './RecreatiusPlace'

// The games themselves are covered by their own tests (and by RecreatiusGames.test.tsx); here a stand-in that
// finishes a round on demand, so the place's own behaviour can be checked.
vi.mock('../../../features/play/gameRegistry', () => {
  function FakeGame({ onExit, onComplete }: GameProps) {
    return (
      <div>
        <button type="button" onClick={onExit}>
          Enrere del joc
        </button>
        <button type="button" onClick={() => onComplete({ answered: 8, correct: 7, petals: 4, masteredSkillIds: [] })}>
          Acaba la ronda
        </button>
      </div>
    )
  }
  return { GAME_REGISTRY: { 'duel-llampec': FakeGame, 'tren-sumes': FakeGame, 'pesca-sumes': FakeGame } }
})

// Component tests are slow when the whole suite runs under coverage: wait longer before giving up.
vi.setConfig({ testTimeout: 20_000 })
configure({ asyncUtilTimeout: 5000 })

beforeEach(() => {
  activateTestPlayer()
})

function renderRoom(pending: number, onSolved = vi.fn(), callSignal = 0) {
  const ui = (signal: number) => (
    <MemoryRouter>
      <RecreatiusPlace pending={pending} callSignal={signal} onSolved={onSolved} onExit={vi.fn()} />
    </MemoryRouter>
  )
  const view = render(ui(callSignal))
  return { onSolved, rerender: (signal: number) => view.rerender(ui(signal)) }
}

describe('RecreatiusPlace: the room', () => {
  it('shows three cabinets, the claw, the ticket counter with a ribbon per game, and a neighbour', () => {
    renderRoom(0)
    for (const name of ['Duel Llampec: juga', 'Tren de Sumes: juga', 'Pesca de Sumes: juga'])
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'La màquina de la grua' })).toBeInTheDocument()
    const ribbons = within(screen.getByRole('list', { name: 'Cintes personals' })).getAllByRole('listitem')
    expect(ribbons.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Tren de Sumes: Encara no hi ha cinta',
      'Pesca de Sumes: Encara no hi ha cinta',
      'Duel Llampec: Encara no hi ha cinta',
    ])
    expect(screen.getByRole('img', { name: 'En Kofi' })).toBeInTheDocument()
    expect(screen.getByTestId('arcade-bubble')).toHaveTextContent(/cintes/)
  })

  it('the pending warm-up lights the Duel as «Escalfament» and the neighbour says so', () => {
    renderRoom(2)
    expect(screen.getByRole('button', { name: 'Duel Llampec, escalfament: juga' })).toHaveAttribute('data-warmup', 'true')
    expect(screen.getByRole('button', { name: 'Tren de Sumes: juga' })).toHaveAttribute('data-warmup', 'false')
    expect(screen.getByTestId('arcade-bubble')).toHaveTextContent('Fes l’escalfament al Duel Llampec!')
  })

  it('lights and music are switches, nothing costs coins', async () => {
    renderRoom(0)
    expect(screen.getByTestId('arcade-backdrop')).toHaveAttribute('data-lit', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Apaga els llums' }))
    expect(screen.getByTestId('arcade-backdrop')).toHaveAttribute('data-lit', 'false')
    expect(screen.getByRole('button', { name: 'Encén els llums' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Posa música' }))
    expect(screen.getByRole('button', { name: 'Atura la música' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Atura la música' }))
    expect(screen.getByRole('button', { name: 'Posa música' })).toBeInTheDocument()
  })
})

describe('RecreatiusPlace: the claw machine', () => {
  it('moves, drops, takes a toy that reacts, and says so politely', async () => {
    renderRoom(0)
    await userEvent.click(screen.getByRole('button', { name: 'Mou la grua a la dreta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Baixa la grua' }))
    expect(screen.getByRole('button', { name: 'Baixa la grua' })).toBeDisabled()
    await waitFor(() => expect(screen.getByRole('img', { name: /^Grua: 1 premis\. Ho has agafat/ })).toBeInTheDocument(), { timeout: 3000 })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Baixa la grua' })).toBeEnabled(), { timeout: 3000 })
    const prize = screen.getByRole('button', { name: 'El premi de la grua' })
    await userEvent.click(prize)
    expect(screen.queryByText(/✕|❌/)).toBeNull()
  })
})

describe('RecreatiusPlace: playing a cabinet', () => {
  it('opens the cabinet screen, a round ends in a celebration with the coins, and she can leave', async () => {
    renderRoom(0)
    await userEvent.click(screen.getByRole('button', { name: 'Tren de Sumes: juga' }))
    expect(screen.getByRole('region', { name: 'Tren de Sumes, a la pantalla' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tren de Sumes: juga' })).toBeNull()
    await userEvent.click(await screen.findByRole('button', { name: 'Acaba la ronda' }))
    expect(screen.getByTestId('cabinet-celebration')).toHaveTextContent('Has guanyat 4 monedes!')
    expect(within(screen.getByTestId('cabinet-celebration')).getByRole('status')).toHaveTextContent('Quina partida!')
    await userEvent.click(screen.getByRole('button', { name: 'Surt de la màquina' }))
    expect(screen.getByRole('button', { name: 'Tren de Sumes: juga' })).toBeInTheDocument()
  })

  it('the warm-up round ticks off the errand board; other cabinets and later rounds do not', async () => {
    const { onSolved } = renderRoom(1)
    await userEvent.click(screen.getByRole('button', { name: 'Tren de Sumes: juga' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Acaba la ronda' }))
    expect(onSolved).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Surt de la màquina' }))
    await userEvent.click(screen.getByRole('button', { name: 'Duel Llampec, escalfament: juga' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Acaba la ronda' }))
    expect(onSolved).toHaveBeenCalledTimes(1)
    expect(onSolved).toHaveBeenCalledWith(4)
  })

  it('nothing is ticked when the board has no warm-up pending', async () => {
    const { onSolved } = renderRoom(0)
    await userEvent.click(screen.getByRole('button', { name: 'Duel Llampec: juga' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Acaba la ronda' }))
    expect(onSolved).not.toHaveBeenCalled()
  })

  it('the board bell takes her straight to the warm-up cabinet', async () => {
    const { rerender } = renderRoom(1)
    expect(screen.queryByTestId('cabinet-screen')).toBeNull()
    rerender(1)
    expect(await screen.findByRole('region', { name: 'Duel Llampec, a la pantalla' })).toBeInTheDocument()
  })

  it('«Enrere» of the game leaves the cabinet', async () => {
    renderRoom(0)
    await userEvent.click(screen.getByRole('button', { name: 'Pesca de Sumes: juga' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Enrere del joc' }))
    expect(screen.getByRole('button', { name: 'Pesca de Sumes: juga' })).toBeInTheDocument()
  })
})

describe('Recreatius module', () => {
  it('is a place open from day one that serves the duel skills', () => {
    expect(place).toMatchObject({ id: 'recreatius', gameId: 'duel-llampec', unlock: 'always' })
    expect(place.skills).toEqual(expect.arrayContaining(['A4', 'A6', 'C4', 'D2']))
    expect(typeof place.facade).toBe('function')
  })
})
