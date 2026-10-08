import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { newSkillState } from '../../core/engine/mastery'
import { useProgress } from '../../core/progress/store'
import { exportProgress, serializeBackup } from '../../core/storage/backup'
import { emptyRewards, type MatesDb } from '../../core/storage/db'
import { activateTestPlayer } from '../../test/playerDb'
import { readMeta, setLastBackupAt } from '../../core/storage/meta'
import FamilyPage from './FamilyPage'
import type { SaveFile } from './saveFile'

const NOW = new Date(2026, 9, 7, 12, 0).getTime()
const PROFILE = { id: 'me' as const, name: 'Laia', character: 'nyx' as const, color: 'rosa' as const, diagnosticDone: true, createdAt: 1 }

async function seedDevice() {
  await db.profile.put(PROFILE)
  await db.skillStates.bulkPut([{ ...newSkillState('A1'), status: 'dominada', mastery: 0.95 }, newSkillState('A4')])
  await db.rewards.put({ id: 'me', petals: 42, stickers: [], daysPlayed: ['2026-10-01', '2026-10-02', '2026-10-05'], missionsDone: [], decorOwned: [], decorPlaced: [], dailyDone: [] })
  await useProgress.getState().load()
}

function renderPage(saveFile: SaveFile = vi.fn(async () => 'downloaded' as const)) {
  render(
    <MemoryRouter initialEntries={['/familia']}>
      <Routes>
        <Route path="/familia" element={<FamilyPage saveFile={saveFile} now={() => NOW} />} />
        <Route path="/start" element={<p>Pantalla d’inici</p>} />
        <Route path="/" element={<p>Inici del jugador</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return saveFile
}

let db: MatesDb

beforeEach(async () => {
  db = activateTestPlayer()
  await Promise.all([db.profile.clear(), db.skillStates.clear(), db.factStates.clear(), db.attempts.clear(), db.rewards.clear(), db.meta.clear()])
  useProgress.setState({ loaded: true, profile: undefined, skillStates: {}, factStates: {}, rewards: emptyRewards(), sessionResults: [], storageError: false })
  await seedDevice()
})

describe('FamilyPage', () => {
  it('explains that progress lives only on this device and shows a read-only summary', async () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Per a la família' })).toBeInTheDocument()
    expect(screen.getByText(/només en aquest dispositiu/)).toBeInTheDocument()
    const summary = screen.getByRole('list', { name: 'Resum del progrés' })
    expect(within(summary).getByText('Dies jugats').nextSibling).toHaveTextContent('3')
    expect(within(summary).getByText('Pètals').nextSibling).toHaveTextContent('42')
    expect(within(summary).getByText('Habilitats dominades').nextSibling).toHaveTextContent('1')
    expect(screen.getByText(/Versió de l’app/)).toBeInTheDocument()
  })

  it('shows the reminder when no copy was ever saved, and hides it after saving one', async () => {
    renderPage()
    expect(await screen.findByText('Encara no has desat cap còpia del progrés.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Desa una còpia del progrés' }))
    await waitFor(() => expect(screen.queryByText('Encara no has desat cap còpia del progrés.')).not.toBeInTheDocument())
  })

  it('does not nag when the last copy is recent', async () => {
    await setLastBackupAt(db, NOW - 3 * 24 * 60 * 60 * 1000)
    renderPage()
    expect(await screen.findByText(/Última còpia:/)).toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('the export button hands a compact backup to the save function with the dated filename', async () => {
    const saveFile = renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Desa una còpia del progrés' }))
    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1))
    const [blob, filename] = vi.mocked(saveFile).mock.calls[0] ?? []
    expect(filename).toBe('mates-magiques-2026-10-07.json')
    const text = await (blob as Blob).text()
    expect(JSON.parse(text)).toMatchObject({ app: 'mates-magiques', formatVersion: 1, exportedAt: NOW, profile: { name: 'Laia' } })
    expect(await screen.findByRole('status')).toHaveTextContent('Còpia desada')
    expect((await readMeta(db)).lastBackupAt).toBe(NOW)
  })

  it('a cancelled share does not count as a saved copy', async () => {
    renderPage(vi.fn(async () => 'cancelled' as const))
    await userEvent.click(screen.getByRole('button', { name: 'Desa una còpia del progrés' }))
    await waitFor(async () => expect((await readMeta(db)).lastBackupAt).toBeUndefined())
    expect(screen.queryByText(/Còpia desada/)).not.toBeInTheDocument()
  })

  it('previews a backup before applying it, then restores it after confirmation', async () => {
    const text = serializeBackup({ ...(await exportProgress(() => NOW)), skillStates: [newSkillState('B1')] })
    renderPage()
    await userEvent.upload(screen.getByLabelText('Recupera una còpia'), new File([text], 'copia.json', { type: 'application/json' }))
    const preview = await screen.findByRole('region', { name: 'Còpia trobada' })
    expect(preview).toHaveTextContent('Laia')
    expect(within(preview).getByText('Habilitats').nextSibling).toHaveTextContent('1')
    expect(await db.skillStates.count()).toBe(2)

    await userEvent.click(within(preview).getByRole('button', { name: 'Substitueix el progrés d’aquest dispositiu' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Còpia recuperada')
    expect((await db.skillStates.toArray()).map((s) => s.skillId)).toEqual(['B1'])
    expect(useProgress.getState().skillStates.B1).toBeDefined()
  })

  it('a file that is not a backup is refused with a clear message', async () => {
    renderPage()
    await userEvent.upload(screen.getByLabelText('Recupera una còpia'), new File(['hola'], 'res.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('no és una còpia de Mates Màgiques')
  })

  it('erasing needs the child’s name typed; the player stays and starts again from the diagnostic', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Esborra tot el progrés' }))
    const confirm = screen.getByRole('button', { name: 'Sí, esborra-ho tot' })
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Escriu «Laia» per confirmar'), 'Lai')
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Escriu «Laia» per confirmar'), 'a')
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    expect(await screen.findByText('Inici del jugador')).toBeInTheDocument()
    expect(await db.skillStates.count()).toBe(0)
    expect(await db.profile.get('me')).toMatchObject({ name: 'Laia', diagnosticDone: false })
  })
})
