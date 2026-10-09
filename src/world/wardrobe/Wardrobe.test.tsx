import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../core/progress/store'
import { activateTestPlayer } from '../../test/playerDb'
import { grantCoins, useWorldStore } from '../data'
import { Wardrobe } from './Wardrobe'

beforeEach(() => {
  activateTestPlayer()
  useProgress.setState({ profile: { id: 'me', name: 'Laia', character: 'blau', color: 'menta', diagnosticDone: true, createdAt: 0 } })
})

async function openOn(tab: string) {
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(<Wardrobe onClose={onClose} />)
  await user.click(await screen.findByRole('tab', { name: tab }))
  return { onClose, user }
}

describe('Wardrobe', () => {
  it('trying on an unowned top offers to buy it; short of coins, a friendly nudge to do errands', async () => {
    const { user, onClose } = await openOn('Roba de dalt')
    await user.click(screen.getByRole('radio', { name: 'Camisa, 15 monedes' }))
    await user.click(screen.getByRole('button', { name: 'Compra Camisa per 15 monedes' }))
    expect(screen.getByRole('status')).toHaveTextContent('No tens prou monedes encara: fes encàrrecs!')
    await user.click(screen.getByRole('button', { name: 'Fet!' }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(/Primer compra/)
  })

  it('buys with coins, wears it and saves the look', async () => {
    const { user, onClose } = await openOn('Roba de dalt')
    await act(async () => {
      await grantCoins(20, 'prova')
    })
    expect(screen.getByLabelText('20 monedes')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Camisa, 15 monedes' }))
    await user.click(screen.getByRole('button', { name: 'Compra Camisa per 15 monedes' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Comprat!/))
    expect(screen.getByLabelText('5 monedes')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Camisa' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('button', { name: 'Fet!' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(useWorldStore.getState().row?.avatar.top.item).toBe('camisa')
    expect(useWorldStore.getState().row?.owned).toContain('camisa')
  })

  it('can be closed without saving', async () => {
    const { user, onClose } = await openOn('Pell')
    await user.click(screen.getByRole('button', { name: 'Tanca l’armari' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
