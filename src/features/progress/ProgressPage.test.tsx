import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { newSkillState } from '../../core/engine/mastery'
import { todayKey, useProgress } from '../../core/progress/store'
import { emptyRewards, type MatesDb } from '../../core/storage/db'
import { activateTestPlayer } from '../../test/playerDb'
import { batch, NOW } from './analytics/testData'
import { newDayState, recordResolved, REQUESTS_META_KEY } from '../../world/requests/dayState'
import { defaultAvatar } from '../../world/characters/wearables'
import ProgressPage from './ProgressPage'

const PROFILE = { id: 'me' as const, name: 'Laia', character: 'nyx' as const, color: 'rosa' as const, diagnosticDone: true, createdAt: 1 }
let db: MatesDb

beforeEach(async () => {
  db = activateTestPlayer()
  await Promise.all([db.profile.clear(), db.skillStates.clear(), db.factStates.clear(), db.attempts.clear(), db.rewards.clear(), db.meta.clear(), db.world.clear()])
  useProgress.setState({ loaded: true, profile: PROFILE, skillStates: {}, factStates: {}, rewards: emptyRewards(), storageError: false })
})

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/progres']}>
      <Routes>
        <Route path="/progres" element={<ProgressPage now={() => NOW} />} />
        <Route path="/poble" element={<p>El poble</p>} />
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

  it('goes back to the town when the check is cancelled', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Tanca' }))
    expect(screen.getByText('El poble')).toBeInTheDocument()
  })

  it('shows a friendly empty state without any history', async () => {
    renderPage()
    await passGate()
    expect(await screen.findByRole('heading', { name: 'Resum' })).toBeInTheDocument()
    expect(screen.getByText(/Encara no hi ha activitat/)).toBeInTheDocument()
    for (const name of ['Recomanacions', 'El poble', 'Operacions', 'Mapa d’habilitats', 'Mapa de fets', 'Temps i constància', 'Evolució', 'Errors més freqüents']) {
      expect(await screen.findByRole('region', { name })).toBeInTheDocument()
    }
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/)
  })

  it('shows facts mastered per operation, the strict order and no promised dates', async () => {
    renderPage()
    await passGate()
    const section = await screen.findByRole('region', { name: 'Operacions' })
    expect(section).toHaveTextContent(/Sumes: 0 de \d+ automatitzades/)
    expect(section).toHaveTextContent('Les restes s’obriran quan les sumes estiguin al 90 %.')
    expect(section).toHaveTextContent('Les divisions s’obriran quan les multiplicacions estiguin al 90 %.')
    expect(section.querySelectorAll('[data-operation]')).toHaveLength(4)
    expect(section.textContent).not.toMatch(/en \d+ (dies|setmanes|mesos)/)
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

  it('shows the town for the parents: places, today’s jar, week, coins and recent visits, in a positive tone', async () => {
    await db.attempts.bulkPut([...batch(1, 3, { gameId: 'poble-botiga' }), ...batch(2, 1, { gameId: 'poble-botiga', correct: false })])
    await db.meta.put({ key: 'townDailyMinutes', value: 16 })
    await db.world.put({ id: 'world', avatar: defaultAvatar('nyx', 'rosa'), owned: [], placed: {}, placedAt: {}, pets: [], avatarUpdatedAt: 0, petalsSpent: 12 })
    useProgress.setState({ rewards: { ...emptyRewards(), petals: 40 } })
    renderPage()
    await passGate()
    const town = await screen.findByRole('region', { name: 'El poble' })
    await waitFor(() => expect(within(town).getByText('Encàrrecs resolts (7 dies)').nextSibling).toHaveTextContent('3'))
    expect(within(town).getByText('Monedes guanyades').nextSibling).toHaveTextContent('40')
    expect(within(town).getByText('Monedes gastades').nextSibling).toHaveTextContent('12')
    expect(within(town).getByText('Monedes que té ara').nextSibling).toHaveTextContent('28')
    expect(within(town).getByText(/Avui el poble encara no s’ha obert.*uns 16 minuts/)).toBeInTheDocument()
    const places = within(town).getByRole('list', { name: 'Llocs del poble' })
    expect(within(places).getByText('Els Recreatius')).toBeInTheDocument()
    expect(within(places).getAllByText('Obert').length).toBeGreaterThan(0)
    expect(within(places).getAllByText('Tancat per ara').length).toBeGreaterThan(0)
    expect(within(places).getAllByText(/S’obre quan|S’obre amb/).length).toBeGreaterThan(0)
    const visits = within(town).getByRole('list', { name: /Visites dels últims 14 dies/ })
    expect(visits).toHaveTextContent('La Botiga')
    expect(visits).toHaveTextContent('4 respostes')
    expect(town.textContent).not.toMatch(/NaN|Infinity|undefined|nota|suspès|error|fracàs|\d+\s*%/i)
  })

  it('shows today’s jar from the saved day of requests', async () => {
    let day = newDayState(todayKey(NOW), [{ place: 'botiga', count: 5, kind: 'repte', neighbour: 'senyora-pilar' }])
    for (let i = 0; i < 2; i++) day = recordResolved(day, 'botiga', true, i)
    await db.meta.put({ key: REQUESTS_META_KEY, value: day })
    renderPage()
    await passGate()
    const town = await screen.findByRole('region', { name: 'El poble' })
    expect(await within(town).findByText(/Avui porta 2 de 5 encàrrecs, uns 2 de 6 minuts/)).toBeInTheDocument()
    expect(within(town).getByRole('progressbar', { name: 'Tarro d’estrelles d’avui' })).toHaveAttribute('aria-valuenow', '2')
  })
})
