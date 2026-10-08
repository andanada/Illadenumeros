import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { newSkillState, type SkillState, type SkillStatus } from '../../core/engine/mastery'
import { useProgress } from '../../core/progress/store'
import { emptyRewards } from '../../core/storage/db'
import MapPage from './MapPage'

const state = (skillId: string, status: SkillStatus): SkillState => ({ ...newSkillState(skillId), status })

function Where() {
  const { pathname, search } = useLocation()
  return <p>{`${pathname}${search}`}</p>
}

function setStates(states: Record<string, SkillState>): void {
  useProgress.setState({
    loaded: true,
    activePlayerId: '11111111-1111-4111-8111-111111111111',
    profile: { id: 'me', name: 'Laia', character: 'nyx', color: 'rosa', diagnosticDone: true, createdAt: 1 },
    skillStates: states,
    rewards: emptyRewards(),
    clearActivePlayer: vi.fn(async () => undefined),
  })
}

const renderMap = () =>
  render(
    <MemoryRouter initialEntries={['/map']}>
      <Routes>
        <Route path="/map" element={<MapPage />} />
        <Route path="/play/:gameId" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => setStates({}))

describe('Laberint de l’Aventura on the map', () => {
  it('stays closed in every region until three skills are being learned', () => {
    setStates({ A1: state('A1', 'dominada'), A2: state('A2', 'aprenent') })
    renderMap()
    expect(screen.queryByTestId('maze-bosc')).toBeNull()
    expect(screen.getAllByText(/practica 1 parada més per obrir-lo/)).toHaveLength(1)
    expect(screen.getAllByText(/practica 3 parades més per obrir-lo/).length).toBeGreaterThan(0)
  })

  it('opens in a region with three skills learning or mastered and starts it with those skills', async () => {
    setStates({ A1: state('A1', 'dominada'), A2: state('A2', 'aprenent'), A3: state('A3', 'consolidant'), A4: state('A4', 'nova') })
    renderMap()
    expect(screen.queryByTestId('maze-platja')).toBeNull()
    await userEvent.click(screen.getByTestId('maze-bosc'))
    expect(await screen.findByText('/play/laberint-aventura?skills=A1,A2,A3')).toBeInTheDocument()
  })
})
