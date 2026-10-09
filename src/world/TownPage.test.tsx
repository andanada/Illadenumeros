import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../core/progress/store'
import type { MatesDb } from '../core/storage/db'
import { activateTestPlayer } from '../test/playerDb'
import { Street } from './scene/street/Street'
import { defaultAvatar } from './characters'
import { defaultWorld, useWorldStore } from './data'
import TownPage from './TownPage'

let db: MatesDb
const PROFILE = { id: 'me', name: 'Laia', character: 'nyx', color: 'blau', diagnosticDone: true, createdAt: 0 } as const

beforeEach(() => {
  db = activateTestPlayer()
  useProgress.setState({ profile: PROFILE })
})

/** A player who already made her character (no first-visit creator). */
const chosenAvatar = (): Promise<unknown> => db.world.put({ ...defaultWorld(PROFILE), avatarUpdatedAt: 5 })

function renderTown(props: React.ComponentProps<typeof TownPage> = {}) {
  render(
    <MemoryRouter initialEntries={['/poble']}>
      <Routes>
        <Route path="/poble" element={<TownPage {...props} />} />
        <Route path="/map" element={<p>El mapa</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

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
    await chosenAvatar()
    renderTown()
    await userEvent.click(await screen.findByRole('button', { name: 'Entra a la Botiga' }))
    expect(screen.getByLabelText('0 monedes')).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'La Botiga' }, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Encàrrecs: 3 per fer' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    await userEvent.click(screen.getByRole('button', { name: 'Encàrrecs: 3 per fer' }))
    expect(await screen.findByRole('button', { name: 'Ara no' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Surt al carrer' }))
    expect(await screen.findByTestId('street')).toBeInTheDocument()
  })

  it('the errand board from the street leads into the shop; the avatar slot can be overridden', async () => {
    await chosenAvatar()
    const onWardrobe = vi.fn()
    renderTown({ onWardrobe })
    await userEvent.click(await screen.findByRole('button', { name: 'El meu armari' }))
    expect(onWardrobe).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Encàrrecs: 3 per fer' }))
    expect(await screen.findByRole('region', { name: 'La Botiga' }, { timeout: 4000 })).toBeInTheDocument()
  })

  it('the avatar bubble opens L’armari, which closes again', async () => {
    await chosenAvatar()
    renderTown()
    await userEvent.click(await screen.findByRole('button', { name: 'El meu armari' }))
    expect(await screen.findByRole('dialog', { name: 'L’armari' }, { timeout: 4000 })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tanca l’armari' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('first visit: she creates her character before the street, and it is saved', async () => {
    renderTown()
    expect(await screen.findByRole('region', { name: 'Crea el teu personatge' })).toBeInTheDocument()
    expect(screen.queryByTestId('street')).toBeNull()
    await userEvent.click(screen.getByRole('radio', { name: 'Pell molt fosca' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fet!' }))
    expect(await screen.findByTestId('street')).toBeInTheDocument()
    await waitFor(() => expect(useWorldStore.getState().row?.avatarUpdatedAt).toBeGreaterThan(0))
    expect(useWorldStore.getState().row?.avatar.skin).toBe('s6')
  })

  it('a small "Mapa" button goes back to the map', async () => {
    await chosenAvatar()
    renderTown()
    await userEvent.click(await screen.findByRole('button', { name: 'Mapa' }))
    expect(screen.getByText('El mapa')).toBeInTheDocument()
  })
})
