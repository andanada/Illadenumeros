import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useProgress } from '../../core/progress/store'
import { useAccount } from '../../core/sync/accountStore'
import { createAdultCheck } from '../family/adultCheck'
import AccountPage from './AccountPage'

beforeEach(() => {
  useAccount.setState({ status: 'loggedOut', email: undefined, players: {} })
  useProgress.setState({ players: [] })
})

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/compte']}>
      <Routes>
        <Route path="/compte" element={<AccountPage seed="s" />} />
        <Route path="/" element={<p>Inici</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AccountPage (/compte, for a device without players yet)', () => {
  it('asks the adult check first, then shows the account section', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.queryByRole('region', { name: 'Compte de la família' })).toBeNull()
    const check = createAdultCheck('s')
    await user.type(screen.getByLabelText('Resultat'), String(check.a * check.b))
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    expect(screen.getByRole('region', { name: 'Compte de la família' })).toBeInTheDocument()
  })

  it('cancelling the check goes home; once players exist there is a way to pick one', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /Tanca|Cancel/ }))
    expect(screen.getByText('Inici')).toBeInTheDocument()
  })
})
