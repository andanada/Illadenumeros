import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../core/progress/store'
import { activateTestPlayer } from '../test/playerDb'
import { Street } from './scene/street/Street'
import { defaultAvatar } from './characters'
import TownPage from './TownPage'

beforeEach(() => {
  activateTestPlayer()
  useProgress.setState({ profile: { id: 'me', name: 'Laia', character: 'nyx', color: 'blau', diagnosticDone: true, createdAt: 0 } })
})

/** jsdom has no layout: give the street a phone-sized viewport. */
function sizeStreet(width = 390, height = 700): void {
  const street = screen.getByTestId('street')
  Object.defineProperty(street, 'clientWidth', { configurable: true, value: width })
  Object.defineProperty(street, 'clientHeight', { configurable: true, value: height })
}

describe('Street', () => {
  it('opens the shop, and closed places say "Obrim aviat" kindly', async () => {
    const onEnter = vi.fn()
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} onEnter={onEnter} />)
    await userEvent.click(screen.getByRole('button', { name: 'La Casa: obrim aviat' }))
    expect(onEnter).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Entra a la Botiga' }))
    expect(onEnter).toHaveBeenCalledWith('botiga', expect.anything())
  })

  it('a drag pans the street and does not open the building it started on', () => {
    const onEnter = vi.fn()
    const onOffset = vi.fn()
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} onEnter={onEnter} onOffsetChange={onOffset} initialOffset={-100} />)
    sizeStreet()
    act(() => void window.dispatchEvent(new Event('resize')))
    const street = screen.getByTestId('street')
    const shop = screen.getByRole('button', { name: 'Entra a la Botiga' })
    fireEvent.pointerDown(shop, { pointerId: 1, clientX: 300, clientY: 300, timeStamp: 0 })
    fireEvent.pointerMove(street, { pointerId: 1, clientX: 250, clientY: 300, timeStamp: 16 })
    fireEvent.pointerMove(street, { pointerId: 1, clientX: 200, clientY: 300, timeStamp: 32 })
    fireEvent.pointerUp(street, { pointerId: 1, clientX: 200, clientY: 300, timeStamp: 40 })
    fireEvent.click(shop)
    expect(onEnter).not.toHaveBeenCalled()
    expect(onOffset).toHaveBeenCalled()
  })

  it('arrow buttons walk; at the start the left arrow is off', async () => {
    const onOffset = vi.fn()
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} onEnter={vi.fn()} onOffsetChange={onOffset} initialOffset={0} />)
    sizeStreet()
    act(() => void window.dispatchEvent(new Event('resize')))
    expect(screen.getByRole('button', { name: 'Camina cap a l’esquerra' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Camina cap a la dreta' }))
    await act(async () => new Promise((r) => setTimeout(r, 50)))
    expect(onOffset).toHaveBeenCalled()
  })
})

describe('TownPage', () => {
  it('street → shop → street, with the HUD on top', async () => {
    render(
      <MemoryRouter>
        <TownPage />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText('0 monedes')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Entra a la Botiga' }))
    expect(await screen.findByRole('region', { name: 'La Botiga' }, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Encàrrecs: 3 per fer' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    await userEvent.click(screen.getByRole('button', { name: 'Encàrrecs: 3 per fer' }))
    expect(await screen.findByRole('button', { name: 'Ara no' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Surt al carrer' }))
    expect(await screen.findByTestId('street')).toBeInTheDocument()
  })

  it('the errand board from the street leads into the shop; the avatar opens the wardrobe slot', async () => {
    const onWardrobe = vi.fn()
    render(
      <MemoryRouter>
        <TownPage onWardrobe={onWardrobe} />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'El meu armari' }))
    expect(onWardrobe).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Encàrrecs: 3 per fer' }))
    expect(await screen.findByRole('region', { name: 'La Botiga' }, { timeout: 4000 })).toBeInTheDocument()
  })

  it('without a wardrobe slot a friendly "soon" note shows', async () => {
    render(
      <MemoryRouter>
        <TownPage />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'El meu armari' }))
    await userEvent.click(screen.getByRole('button', { name: 'D’acord' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
