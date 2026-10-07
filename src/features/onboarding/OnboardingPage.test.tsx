import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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
})
