import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dexie from 'dexie'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../core/progress/store'
import { readPlayers } from '../../core/storage/registry'
import { wipeAllDatabases } from '../../test/idb'
import { resetStoreForTest } from '../../test/playerDb'
import FamilyPage from './FamilyPage'

const store = () => useProgress.getState()
let laia = ''
let pau = ''

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/familia']}>
      <Routes>
        <Route path="/familia" element={<FamilyPage saveFile={vi.fn(async () => 'downloaded' as const)} now={() => 1} />} />
        <Route path="/start" element={<p>Pantalla d’inici</p>} />
        <Route path="/qui-juga" element={<p>Qui juga</p>} />
        <Route path="/" element={<p>Inici del jugador</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return screen.getByRole('region', { name: 'Jugadors' })
}

beforeEach(async () => {
  await wipeAllDatabases()
  resetStoreForTest()
  laia = await store().createPlayer({ name: 'Laia', character: 'nyx', color: 'rosa' })
  pau = await store().createPlayer({ name: 'Pau', character: 'blau', color: 'blau' })
})
afterEach(wipeAllDatabases)

describe('FamilyPage · Jugadors', () => {
  it('lists every player and marks who is playing now', () => {
    const section = renderPage()
    const items = within(within(section).getByRole('list')).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([expect.stringContaining('Laia'), expect.stringContaining('Pau')])
    expect(items[1]).toHaveTextContent('juga ara')
  })

  it('says that backup, restore and reset only affect the active player', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Còpia de seguretat de Pau' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recuperar una còpia per a Pau' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Començar de zero amb Pau' })).toBeInTheDocument()
    expect(screen.getByText(/només a Pau/)).toBeInTheDocument()
  })

  it('renames a player inline, with the same name rules as the onboarding', async () => {
    const section = renderPage()
    await userEvent.click(within(section).getByRole('button', { name: 'Canvia el nom de Laia' }))
    const input = within(section).getByLabelText('Nou nom de Laia')
    await userEvent.clear(input)
    await userEvent.click(within(section).getByRole('button', { name: 'Desa el nom' }))
    expect(within(section).getByRole('alert')).toHaveTextContent('Escriu el teu nom')

    await userEvent.type(input, 'Laieta')
    await userEvent.click(within(section).getByRole('button', { name: 'Desa el nom' }))
    await waitFor(() => expect(store().players.find((p) => p.id === laia)?.name).toBe('Laieta'))
    expect(within(section).getByText('Laieta')).toBeInTheDocument()
    expect((await readPlayers()).players.find((p) => p.id === laia)?.name).toBe('Laieta')
  })

  it('deleting needs the player’s name typed, explains the scope, and only removes that player', async () => {
    const section = renderPage()
    await userEvent.click(within(section).getByRole('button', { name: 'Esborra Laia' }))
    expect(within(section).getByText(/només d’aquest dispositiu/)).toBeInTheDocument()
    const confirm = within(section).getByRole('button', { name: 'Sí, esborra Laia' })
    expect(confirm).toBeDisabled()
    await userEvent.type(within(section).getByLabelText('Escriu «Laia» per confirmar'), 'laia')
    await userEvent.click(confirm)

    await waitFor(() => expect(store().players.map((p) => p.id)).toEqual([pau]))
    expect(await Dexie.exists(`mates-magiques-${laia}`)).toBe(false)
    expect(store().activePlayerId).toBe(pau)
    expect(within(section).queryByText('Laia')).not.toBeInTheDocument()
  })

  it('deleting the active player goes back to the picker', async () => {
    const section = renderPage()
    await userEvent.click(within(section).getByRole('button', { name: 'Esborra Pau' }))
    await userEvent.type(within(section).getByLabelText('Escriu «Pau» per confirmar'), 'Pau')
    await userEvent.click(within(section).getByRole('button', { name: 'Sí, esborra Pau' }))
    expect(await screen.findByText('Qui juga')).toBeInTheDocument()
    expect(store().activePlayerId).toBeUndefined()
  })

  it('deleting the last player goes back to the start screen', async () => {
    await store().deletePlayer(laia)
    const section = renderPage()
    await userEvent.click(within(section).getByRole('button', { name: 'Esborra Pau' }))
    await userEvent.type(within(section).getByLabelText('Escriu «Pau» per confirmar'), 'Pau')
    await userEvent.click(within(section).getByRole('button', { name: 'Sí, esborra Pau' }))
    expect(await screen.findByText('Pantalla d’inici')).toBeInTheDocument()
    expect(store().players).toEqual([])
  })
})
