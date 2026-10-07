import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress, type PlayerSummary } from '../../core/progress/store'
import { createAdultCheck } from '../family/adultCheck'
import PlayerPickerPage from './PlayerPickerPage'

const player = (id: string, name: string, over: Partial<PlayerSummary> = {}): PlayerSummary => ({
  id,
  dbName: `mates-magiques-${id}`,
  name,
  character: 'nyx',
  color: 'rosa',
  createdAt: 1,
  lastPlayedAt: 1,
  ...over,
})

const A = player('11111111-1111-4111-8111-111111111111', 'Laia')
const B = player('22222222-2222-4222-8222-222222222222', 'Pau', { character: 'blau', color: 'blau' })

function renderPicker() {
  render(
    <MemoryRouter initialEntries={['/qui-juga']}>
      <Routes>
        <Route path="/qui-juga" element={<PlayerPickerPage seed="gate" />} />
        <Route path="/" element={<p>Inici del jugador</p>} />
        <Route path="/onboarding" element={<p>Nou perfil</p>} />
        <Route path="/start" element={<p>Pantalla d’inici</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const selectPlayer = vi.fn(async () => true)

beforeEach(() => {
  selectPlayer.mockClear()
  useProgress.setState({ loaded: true, players: [A, B], activePlayerId: undefined, profile: undefined, selectPlayer })
})

describe('PlayerPickerPage', () => {
  it('asks "Qui juga?" and shows one card per player', () => {
    renderPicker()
    expect(screen.getByRole('heading', { level: 1, name: 'Qui juga?' })).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Jugadors' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Entra: Laia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entra: Pau' })).toBeInTheDocument()
  })

  it('each card wears its player’s colour theme', () => {
    renderPicker()
    expect(screen.getByRole('button', { name: 'Entra: Pau' })).toHaveAttribute('data-theme', 'blau')
  })

  it('tapping a card selects that player and goes home', async () => {
    renderPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Entra: Pau' }))
    expect(selectPlayer).toHaveBeenCalledWith(B.id)
    expect(await screen.findByText('Inici del jugador')).toBeInTheDocument()
  })

  it('is keyboard operable', async () => {
    renderPicker()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Entra: Laia' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(selectPlayer).toHaveBeenCalledWith(A.id)
  })

  it('two players with the same name are told apart by their character', () => {
    useProgress.setState({ players: [A, player('33333333-3333-4333-8333-333333333333', 'Laia', { character: 'mixa' })] })
    renderPicker()
    expect(screen.getByRole('button', { name: 'Entra: Laia (Nyx)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entra: Laia (Mixa)' })).toBeInTheDocument()
  })

  it('adding a player is behind the adult check, then goes to the onboarding', async () => {
    renderPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Nou jugador o jugadora (només adults)' }))
    const gate = screen.getByRole('dialog', { name: 'Només per a adults' })
    expect(screen.queryByText('Nou perfil')).not.toBeInTheDocument()
    await userEvent.type(within(gate).getByLabelText('Resultat'), String(createAdultCheck('gate').answer))
    await userEvent.click(within(gate).getByRole('button', { name: 'Entra' }))
    expect(await screen.findByText('Nou perfil')).toBeInTheDocument()
  })

  it('closing the adult check does not open the onboarding', async () => {
    renderPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Nou jugador o jugadora (només adults)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Tanca' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Nou perfil')).not.toBeInTheDocument()
  })

  it('without players it sends to the start screen', async () => {
    useProgress.setState({ players: [] })
    renderPicker()
    expect(await screen.findByText('Pantalla d’inici')).toBeInTheDocument()
  })
})
