import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { isMuted, setMuted } from '../../core/audio/speech'
import { defaultAvatar } from '../characters'
import { CoinCounter } from './CoinCounter'
import { Hud } from './Hud'
import { jarMessage } from './jarMessage'
import { StarJar } from './StarJar'

function renderHud(props: Partial<React.ComponentProps<typeof Hud>> = {}) {
  const onWardrobe = vi.fn()
  render(
    <MemoryRouter initialEntries={['/poble']}>
      <Routes>
        <Route path="/poble" element={<Hud avatar={defaultAvatar('nyx', 'rosa')} coins={12} jar={{ level: 0.3, minutesLeft: 8, done: false }} onWardrobe={onWardrobe} {...props} />} />
        <Route path="/familia" element={<p>Pàgina de família</p>} />
        <Route path="/album" element={<p>Àlbum</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return { onWardrobe }
}

describe('Hud', () => {
  it('shows the coins and opens the wardrobe; there is no errand board button any more', async () => {
    const { onWardrobe } = renderHud()
    expect(screen.getByLabelText('12 monedes')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Encàrrecs/ })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'El meu armari' }))
    expect(onWardrobe).toHaveBeenCalledOnce()
  })

  it('the sticker book opens the album', async () => {
    renderHud()
    await userEvent.click(screen.getByRole('button', { name: 'Àlbum de pegatines' }))
    expect(screen.getByText('Àlbum')).toBeInTheDocument()
  })

  it('the jar of stars shows today’s progress and a friendly note, not a task list', async () => {
    renderHud()
    const jar = screen.getByRole('button', { name: 'Tarro d’estrelles: 30 %' })
    expect(screen.queryByRole('status')).toBeNull()
    await userEvent.click(jar)
    expect(screen.getByRole('status')).toHaveTextContent('Al tarro li falten uns 8 minuts d’estrelles. Ajuda els veïns quan vulguis, sense pressa!')
    expect(screen.queryByRole('list')).toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('lights stars in proportion, and says so kindly when it is full or nearly', async () => {
    const { container } = render(<StarJar jar={{ level: 0.5, minutesLeft: 6, done: false }} />)
    expect(container.querySelectorAll('[data-lit="true"]')).toHaveLength(4)
    expect(jarMessage({ done: false, minutesLeft: 1 })).toMatch(/miqueta/)
    expect(jarMessage({ done: true, minutesLeft: 0 })).toMatch(/El tarro és ple/)
    await userEvent.click(screen.getByRole('button', { name: /Tarro/ }))
    await userEvent.click(document.body)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('the speaker toggles the shared mute', async () => {
    setMuted(false)
    renderHud()
    await userEvent.click(screen.getByRole('button', { name: 'Silencia' }))
    expect(isMuted()).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Activa el so' }))
    expect(isMuted()).toBe(false)
  })

  it('the parents lock asks the adult question, then opens the family page', async () => {
    renderHud()
    await userEvent.click(screen.getByRole('button', { name: 'Per a les famílies' }))
    const prompt = screen.getByText(/^\d+ × \d+$/).textContent ?? ''
    const [a, b] = prompt.split(' × ').map(Number)
    await userEvent.type(screen.getByLabelText('Resultat'), String((a ?? 0) * (b ?? 0)))
    await userEvent.click(screen.getByRole('button', { name: 'Entra' }))
    expect(screen.getByText('Pàgina de família')).toBeInTheDocument()
  })

  it('the lock can be closed without entering', async () => {
    renderHud()
    await userEvent.click(screen.getByRole('button', { name: 'Per a les famílies' }))
    await userEvent.click(screen.getByRole('button', { name: 'Tanca' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('CoinCounter', () => {
  it('announces the coins earned and rolls to the new total', async () => {
    const { rerender } = render(<CoinCounter coins={5} />)
    rerender(<CoinCounter coins={8} />)
    expect(screen.getByLabelText('8 monedes')).toBeInTheDocument()
    expect(screen.getByText('Has guanyat 3 monedes. En tens 8.')).toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
    await act(async () => new Promise((r) => setTimeout(r, 800)))
    expect(screen.getByLabelText('8 monedes')).toHaveTextContent('8')
  })

  it('a lower total (another player) just shows it', () => {
    const { rerender } = render(<CoinCounter coins={5} />)
    rerender(<CoinCounter coins={2} />)
    expect(screen.getByLabelText('2 monedes')).toHaveTextContent('2')
  })
})
