import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AdultGate } from './AdultGate'
import { createAdultCheck } from './adultCheck'

const setup = (seed = 'gate') => {
  const onPass = vi.fn()
  const onCancel = vi.fn()
  render(<AdultGate seed={seed} onPass={onPass} onCancel={onCancel} />)
  return { onPass, onCancel }
}

describe('AdultGate', () => {
  it('shows the multiplication for its seed in a labelled dialog', () => {
    setup()
    expect(screen.getByRole('dialog', { name: 'Només per a adults' })).toBeInTheDocument()
    expect(screen.getByText(createAdultCheck('gate').prompt)).toBeInTheDocument()
  })

  it('lets the adult in with the right answer', async () => {
    const { onPass } = setup()
    await userEvent.type(screen.getByLabelText('Resultat'), String(createAdultCheck('gate').answer))
    await userEvent.click(screen.getByRole('button', { name: 'Entra' }))
    expect(onPass).toHaveBeenCalledTimes(1)
  })

  it('a wrong answer does not open it and shows a new multiplication', async () => {
    const { onPass } = setup()
    const first = createAdultCheck('gate')
    await userEvent.type(screen.getByLabelText('Resultat'), String(first.answer + 1))
    await userEvent.click(screen.getByRole('button', { name: 'Entra' }))
    expect(onPass).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Prova amb aquesta altra')
    expect(screen.getByText(createAdultCheck('gate-1').prompt)).toBeInTheDocument()
    expect(screen.getByLabelText('Resultat')).toHaveValue('')
  })

  it('can be closed without entering', async () => {
    const { onCancel, onPass } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Tanca' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onPass).not.toHaveBeenCalled()
  })
})
