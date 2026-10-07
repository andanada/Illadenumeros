import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { newSkillState } from '../../core/engine/mastery'
import { useProgress } from '../../core/progress/store'
import { emptyRewards, type MatesDb } from '../../core/storage/db'
import { activateTestPlayer } from '../../test/playerDb'
import { batch, NOW } from './analytics/testData'
import ProgressPage from './ProgressPage'

const PROFILE = { id: 'me' as const, name: 'Laia', character: 'nyx' as const, color: 'rosa' as const, diagnosticDone: true, createdAt: 1 }
let db: MatesDb

beforeEach(async () => {
  db = activateTestPlayer()
  await Promise.all([db.profile.clear(), db.skillStates.clear(), db.factStates.clear(), db.attempts.clear(), db.rewards.clear()])
  useProgress.setState({ loaded: true, profile: PROFILE, skillStates: {}, factStates: {}, rewards: emptyRewards(), storageError: false })
})

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/progres']}>
      <Routes>
        <Route path="/progres" element={<ProgressPage now={() => NOW} />} />
        <Route path="/map" element={<p>Mapa</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function passGate() {
  const user = userEvent.setup()
  const gate = await screen.findByRole('dialog', { name: 'Només per a adults' })
  const [a, b] = (gate.querySelector('p[aria-live]')?.textContent ?? '').split(' × ').map(Number)
  await user.type(screen.getByLabelText('Resultat'), String((a ?? 0) * (b ?? 0)))
  await user.click(screen.getByRole('button', { name: 'Entra' }))
}

describe('ProgressPage', () => {
  it('hides everything behind the adult check', () => {
    renderPage()
    expect(screen.getByRole('dialog', { name: 'Només per a adults' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Resum' })).not.toBeInTheDocument()
  })

  it('goes back to the map when the check is cancelled', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Tanca' }))
    expect(screen.getByText('Mapa')).toBeInTheDocument()
  })

  it('shows a friendly empty state without any history', async () => {
    renderPage()
    await passGate()
    expect(await screen.findByRole('heading', { name: 'Resum' })).toBeInTheDocument()
    expect(screen.getByText(/Encara no hi ha activitat/)).toBeInTheDocument()
    for (const name of ['Recomanacions', 'Mapa d’habilitats', 'Mapa de fets', 'Temps i constància', 'Evolució', 'Errors més freqüents']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/)
  })

  it('renders the seeded history and prints on demand', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    await db.attempts.bulkPut(batch(0, 12, { skillId: 'A4', correct: false, misconception: 'off-by-one' }))
    useProgress.setState({ skillStates: { A4: { ...newSkillState('A4'), status: 'aprenent', attempts: 12, mastery: 0.3 } } })
    renderPage()
    await passGate()
    expect(await screen.findByText('Es queda a un d’encertar')).toBeInTheDocument()
    expect(screen.getByText(/Ara treballa continguts de 1r/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Imprimeix / desa en PDF' }))
    expect(print).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByRole('img', { name: /Minuts jugats per dia/ })).toBeInTheDocument())
    print.mockRestore()
  })
})
