import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../core/progress/store'
import { emptyRewards } from '../../core/storage/db'
import MapPage from './MapPage'

const clearActivePlayer = vi.fn(async () => undefined)

beforeEach(() => {
  clearActivePlayer.mockClear()
  useProgress.setState({
    loaded: true,
    activePlayerId: '11111111-1111-4111-8111-111111111111',
    profile: { id: 'me', name: 'Laia', character: 'nyx', color: 'rosa', diagnosticDone: true, createdAt: 1 },
    skillStates: {},
    rewards: emptyRewards(),
    clearActivePlayer,
  })
})

describe('MapPage', () => {
  it('shows who is playing and lets the child change player', async () => {
    render(
      <MemoryRouter initialEntries={['/map']}>
        <Routes>
          <Route path="/map" element={<MapPage />} />
          <Route path="/qui-juga" element={<p>Qui juga</p>} />
        </Routes>
      </MemoryRouter>,
    )
    const change = screen.getByRole('button', { name: 'Laia · Canvia de jugador/a' })
    expect(change).toHaveTextContent('Laia')
    await userEvent.click(change)
    expect(clearActivePlayer).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Qui juga')).toBeInTheDocument()
  })

  it('keeps the adult lock to the family page', () => {
    render(
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Per a la família (només adults)' })).toBeInTheDocument()
  })

  it('shows the Ciutat dels Decimals with its 10 stops, closed until 4t is mastered', () => {
    render(
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Ciutat dels Decimals' })).toBeInTheDocument()
    expect(screen.getByText('Domina «Muntanya dels Milers» per obrir-la')).toBeInTheDocument()
    expect(screen.queryByText('Aviat!')).toBeNull()
    const city = document.querySelector('[data-region="ciutat"]')
    expect(city?.querySelectorAll('button').length).toBe(10)
  })

  it('a big "El Poble (nou!)" card leads to the new town', async () => {
    render(
      <MemoryRouter initialEntries={['/map']}>
        <Routes>
          <Route path="/map" element={<MapPage />} />
          <Route path="/poble" element={<p>El poble</p>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'El Poble (nou!)' }))
    expect(await screen.findByText('El poble')).toBeInTheDocument()
  })
})
