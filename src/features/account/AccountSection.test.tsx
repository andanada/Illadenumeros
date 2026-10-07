import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useProgress } from '../../core/progress/store'
import { configureAccount, useAccount } from '../../core/sync/accountStore'
import { createFakeServer, type FakeServer } from '../../core/sync/fakeServer.testutil'
import { wipeAllDatabases } from '../../test/idb'
import { resetStoreForTest } from '../../test/playerDb'
import { AccountSection } from './AccountSection'

const PW = 'contrasenya-llarga'
let server: FakeServer

beforeEach(async () => {
  localStorage.clear()
  await wipeAllDatabases()
  resetStoreForTest()
  server = createFakeServer()
  server.setAuthed(false)
  configureAccount({ fetch: server.fetch, autoSync: false })
  useAccount.setState({ status: 'loggedOut' })
})
afterEach(async () => {
  configureAccount({ fetch: server.fetch, autoSync: false })
  await wipeAllDatabases()
})

const section = () => screen.getByRole('region', { name: 'Compte de la família' })

async function loginThroughUi(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Entra' }))
  await user.type(screen.getByLabelText('Correu electrònic'), 'familia@exemple.cat')
  await user.type(screen.getByLabelText('Contrasenya'), PW)
  await user.click(screen.getByRole('button', { name: 'Entra al compte' }))
  await screen.findByText('familia@exemple.cat')
}

describe('AccountSection: logged out', () => {
  it('explains sync in plain Catalan and that the app works without an account', () => {
    render(<AccountSection />)
    expect(within(section()).getByText(/funciona igual sense compte/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crea un compte' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Almenys 10 caràcters/)).toBeInTheDocument()
  })

  it('shows the password only on request', async () => {
    const user = userEvent.setup()
    render(<AccountSection />)
    const field = screen.getByLabelText('Contrasenya')
    expect(field).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Mostra la contrasenya' }))
    expect(field).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Amaga la contrasenya' }))
    expect(field).toHaveAttribute('type', 'password')
  })

  it('wrong invite code and weak password show friendly errors', async () => {
    const user = userEvent.setup()
    render(<AccountSection />)
    await user.type(screen.getByLabelText('Correu electrònic'), 'familia@exemple.cat')
    await user.type(screen.getByLabelText('Contrasenya'), PW)
    await user.type(screen.getByLabelText('Codi d’invitació'), 'DOLENT')
    await user.click(screen.getByRole('button', { name: 'Crea el compte' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/codi d’invitació no és correcte/)
    await user.clear(screen.getByLabelText('Contrasenya'))
    await user.type(screen.getByLabelText('Contrasenya'), 'una-feble-x')
    await user.clear(screen.getByLabelText('Codi d’invitació'))
    await user.type(screen.getByLabelText('Codi d’invitació'), 'BON-CODI')
    await user.click(screen.getByRole('button', { name: 'Crea el compte' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no és prou segura/))
  })

  it('a short password is caught before calling the server', async () => {
    const user = userEvent.setup()
    render(<AccountSection />)
    await user.type(screen.getByLabelText('Correu electrònic'), 'a@b.cat')
    await user.type(screen.getByLabelText('Contrasenya'), 'curta')
    await user.type(screen.getByLabelText('Codi d’invitació'), 'BON-CODI')
    await user.click(screen.getByRole('button', { name: 'Crea el compte' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/10 caràcters/)
    expect(server.calls).toEqual([])
  })

  it('register then shows the logged-in panel', async () => {
    const user = userEvent.setup()
    render(<AccountSection />)
    await user.type(screen.getByLabelText('Correu electrònic'), 'familia@exemple.cat')
    await user.type(screen.getByLabelText('Contrasenya'), PW)
    await user.type(screen.getByLabelText('Codi d’invitació'), 'BON-CODI')
    await user.click(screen.getByRole('button', { name: 'Crea el compte' }))
    expect(await screen.findByText('familia@exemple.cat')).toBeInTheDocument()
  })
})

describe('AccountSection: logged in', () => {
  it('shows email, last sync, a chip per player and syncs on demand', async () => {
    const user = userEvent.setup()
    await useProgress.getState().createPlayer({ name: 'Laia', character: 'nyx', color: 'rosa' })
    render(<AccountSection />)
    await loginThroughUi(user)
    expect(screen.getByText(/Encara no s’ha sincronitzat/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sincronitza ara' }))
    expect(await screen.findByText(/Última sincronització/)).toBeInTheDocument()
    const players = screen.getByRole('list', { name: 'Estat de cada jugador' })
    expect(within(players).getByText('Laia')).toBeInTheDocument()
    expect(within(players).getByText('Al dia')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Descarrega les dades del compte/ })).toHaveAttribute('href', '/api/account/export')
  })

  it('shows skipped items without alarming wording, and errors per player', async () => {
    render(<AccountSection />)
    act(() =>
      useAccount.setState({
        status: 'loggedIn',
        email: 'f@e.cat',
        players: { a: { state: 'idle', skipped: 2, quarantined: 1 }, b: { state: 'error', skipped: 0, quarantined: 0, message: 'Límit' }, c: { state: 'detached', skipped: 0, quarantined: 0 } },
      }),
    )
    act(() =>
      useProgress.setState({
        players: ['a', 'b', 'c'].map((id, i) => ({ id, dbName: 'mates-magiques', name: `Nen${i}`, character: 'nyx', color: 'rosa', createdAt: i, lastPlayedAt: i })),
      }),
    )
    expect(screen.getByText(/3 dades no s’han pogut enviar/)).toBeInTheDocument()
    expect(screen.getByText('Límit')).toBeInTheDocument()
    expect(screen.getByText(/Ja no és al compte/)).toBeInTheDocument()
  })

  it('logout returns to the forms', async () => {
    const user = userEvent.setup()
    render(<AccountSection />)
    await loginThroughUi(user)
    await user.click(screen.getByRole('button', { name: 'Surt' }))
    expect(await screen.findByRole('button', { name: 'Crea el compte' })).toBeInTheDocument()
  })

  it('change password: form, wrong current password, success', async () => {
    const user = userEvent.setup()
    render(<AccountSection />)
    await loginThroughUi(user)
    await user.click(screen.getByRole('button', { name: 'Canvia la contrasenya' }))
    await user.type(screen.getByLabelText('Contrasenya actual'), 'equivocada')
    await user.type(screen.getByLabelText('Contrasenya nova'), 'una altra de llarga')
    await user.click(screen.getByRole('button', { name: 'Desa la contrasenya nova' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no és correcta/)
    await user.clear(screen.getByLabelText('Contrasenya actual'))
    await user.type(screen.getByLabelText('Contrasenya actual'), PW)
    await user.click(screen.getByRole('button', { name: 'Desa la contrasenya nova' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/Contrasenya canviada/)
  })

  it('delete account needs two confirmations and the password', async () => {
    const user = userEvent.setup()
    render(<AccountSection />)
    await loginThroughUi(user)
    await user.click(screen.getByRole('button', { name: 'Esborra el compte' }))
    expect(screen.getByText(/es manté en aquest dispositiu/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sí, vull esborrar el compte' }))
    const final = screen.getByRole('button', { name: 'Esborra el compte definitivament' })
    expect(final).toBeDisabled()
    await user.type(screen.getByLabelText('Contrasenya del compte'), PW)
    await user.click(final)
    expect(await screen.findByRole('button', { name: 'Crea el compte' })).toBeInTheDocument()
    expect(server.calls.some((c) => c.method === 'DELETE' && c.path === '/api/account')).toBe(true)
  })
})

describe('AccountSection: other states', () => {
  it('offline and unknown', () => {
    render(<AccountSection />)
    act(() => useAccount.setState({ status: 'offline', email: undefined }))
    expect(screen.getByText(/Sense connexió/)).toBeInTheDocument()
    act(() => useAccount.setState({ status: 'unknown' }))
    expect(screen.getByText(/Comprovant el compte/)).toBeInTheDocument()
  })
})
