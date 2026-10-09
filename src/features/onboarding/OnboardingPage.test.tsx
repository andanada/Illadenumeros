import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { useProgress } from '../../core/progress/store'
import OnboardingPage from './OnboardingPage'

describe('OnboardingPage', () => {
  it('asks for a name before moving on, without scolding', async () => {
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Continua' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Escriu el teu nom')
    expect(screen.getByLabelText('Com et dius?')).toBeInTheDocument()
  })

  it('moves to the avatar creator with a valid name', async () => {
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('Com et dius?'), 'Júlia')
    await userEvent.click(screen.getByRole('button', { name: 'Continua' }))
    expect(screen.getByRole('region', { name: 'Crea el teu personatge' })).toBeInTheDocument()
  })

  it('name → avatar → «Benvinguda al poble!» creates a NEW player and goes to the arrival errands', async () => {
    const createPlayer = vi.fn(async () => '11111111-1111-4111-8111-111111111111')
    useProgress.setState({ createPlayer })
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/diagnostic" element={<p>Prova inicial</p>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('Com et dius?'), ' Pau ')
    await userEvent.click(screen.getByRole('button', { name: 'Continua' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fet!' }))
    expect(await screen.findByRole('heading', { name: 'Benvinguda al poble!' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Som-hi!' }))
    expect(await screen.findByText('Prova inicial')).toBeInTheDocument()
    expect(createPlayer).toHaveBeenCalledWith({ name: 'Pau', character: expect.any(String), color: expect.any(String) })
  })
})
