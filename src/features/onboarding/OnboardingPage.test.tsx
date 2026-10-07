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

  it('moves to the character step with a valid name and requires a pick', async () => {
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('Com et dius?'), 'Júlia')
    await userEvent.click(screen.getByRole('button', { name: 'Continua' }))
    expect(screen.getByRole('radiogroup', { name: 'Personatge preferit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continua' })).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: 'Nyx' }))
    expect(screen.getByRole('button', { name: 'Continua' })).toBeEnabled()
  })

  it('finishing creates a NEW player (its own progress) and goes to that player’s diagnostic', async () => {
    const createPlayer = vi.fn(async () => '11111111-1111-4111-8111-111111111111')
    const saveProfile = vi.fn(async () => undefined)
    useProgress.setState({ createPlayer, saveProfile })
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
    await userEvent.click(screen.getByRole('radio', { name: 'Blau' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continua' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Menta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continua' }))
    await userEvent.click(screen.getByRole('button', { name: 'Som-hi!' }))
    expect(await screen.findByText('Prova inicial')).toBeInTheDocument()
    expect(createPlayer).toHaveBeenCalledWith({ name: 'Pau', character: 'blau', color: 'menta' })
    expect(saveProfile).not.toHaveBeenCalled()
  })
})
