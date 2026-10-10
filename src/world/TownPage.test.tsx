import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { lazy } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { todayKey, useProgress } from '../core/progress/store'
import type { MatesDb } from '../core/storage/db'
import { activateTestPlayer } from '../test/playerDb'
import { BOARD_ERRANDS } from './board/boardPlan'
import { defaultAvatar } from './characters'
import { defaultWorld, useWorldStore } from './data'
import { place as botiga } from './places/botiga'
import { resetRequestStoreForTest } from './requests/requestStore'
import type { PlaceModule, PlaceProps } from './places/types'
import { Street, type StreetSpot } from './scene/street/Street'
import TownPage from './TownPage'

// The real registry imports every place; these tests plug in their own (a tiny test double).
vi.mock('./places/registry', () => ({ PLACES: [] }))

let db: MatesDb
const PROFILE = { id: 'me', name: 'Laia', character: 'nyx', color: 'blau', diagnosticDone: true, createdAt: 0 } as const
const NOW = new Date(2026, 9, 9, 17, 30).getTime()
const now = (): number => NOW

function FakeCasa({ pending, callSignal, onSolved, onExit }: PlaceProps) {
  return (
    <section aria-label="La Casa de prova">
      <p>Pendents: {pending}</p>
      <p>Timbre: {callSignal}</p>
      <button type="button" onClick={() => onSolved(3)}>
        Resol
      </button>
      <button type="button" onClick={onExit}>
        Surt de casa
      </button>
    </section>
  )
}

const casa: PlaceModule = { id: 'casa', title: 'La Casa', gameId: 'poble-casa', skills: ['A4', 'A5'], unlock: 'always', facade: 'facana-casa', Component: lazy(async () => ({ default: FakeCasa })) }
const perruqueria: PlaceModule = { ...casa, id: 'perruqueria', title: 'La Perruqueria', unlock: { operation: 'mul' } }

beforeEach(() => {
  db = activateTestPlayer()
  resetRequestStoreForTest()
  useProgress.setState({ profile: PROFILE })
})

/** A player who already made her character (no first-visit creator). */
const chosenAvatar = (): Promise<unknown> => db.world.put({ ...defaultWorld(PROFILE), avatarUpdatedAt: 5 })

function renderTown(props: React.ComponentProps<typeof TownPage> = {}) {
  render(
    <MemoryRouter initialEntries={['/poble']}>
      <Routes>
        <Route path="/poble" element={<TownPage now={now} places={[casa, botiga, perruqueria]} {...props} />} />
        <Route path="/qui-juga" element={<p>Qui juga?</p>} />
        <Route path="/album" element={<p>L’àlbum</p>} />
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

const SPOTS: readonly StreetSpot[] = [
  { id: 'casa', name: 'la Casa', open: false, facade: 'facana-casa' },
  { id: 'botiga', name: 'la Botiga', open: true, facade: 'facana-botiga' },
  { id: 'fleca', name: 'la Fleca', open: false, facade: undefined },
]

describe('Street', () => {
  it('opens the shop; closed and unbuilt places say "Obrim aviat" kindly', async () => {
    const onEnter = vi.fn()
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} spots={SPOTS} onEnter={onEnter} />)
    await userEvent.click(screen.getByRole('button', { name: 'La Casa: obrim aviat' }))
    await userEvent.click(screen.getByRole('button', { name: 'La Fleca: obrim aviat' }))
    expect(onEnter).not.toHaveBeenCalled()
    expect(screen.getAllByText('Obrim aviat!')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Entra a la Botiga' }))
    expect(onEnter).toHaveBeenCalledWith('botiga', expect.anything())
  })

  it('a drag pans the street and does not open the building it started on', () => {
    const onEnter = vi.fn()
    const onOffset = vi.fn()
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} spots={SPOTS} onEnter={onEnter} onOffsetChange={onOffset} initialOffset={-100} />)
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
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} spots={SPOTS} onEnter={vi.fn()} onOffsetChange={onOffset} initialOffset={0} />)
    sizeStreet()
    act(() => void window.dispatchEvent(new Event('resize')))
    expect(screen.getByRole('button', { name: 'Camina cap a l’esquerra' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Camina cap a la dreta' }))
    await act(async () => new Promise((r) => setTimeout(r, 50)))
    expect(onOffset).toHaveBeenCalled()
  })

  it('«Vés-hi!» walks to the place and then goes in', async () => {
    const onEnter = vi.fn()
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} spots={SPOTS} onEnter={onEnter} walkTo={{ id: 'botiga', nonce: 1 }} />)
    expect(onEnter).not.toHaveBeenCalled()
    await waitFor(() => expect(onEnter).toHaveBeenCalledWith('botiga', expect.anything()), { timeout: 2000 })
  })

  it('greets her until she walks', async () => {
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} spots={SPOTS} onEnter={vi.fn()} greeting="Hola, Laia!" initialOffset={0} />)
    expect(screen.getByText('Hola, Laia!')).toBeInTheDocument()
    sizeStreet()
    act(() => void window.dispatchEvent(new Event('resize')))
    await act(async () => new Promise((r) => setTimeout(r, 1300)))
    await userEvent.click(screen.getByRole('button', { name: 'Camina cap a la dreta' }))
    await waitFor(() => expect(screen.queryByText('Hola, Laia!')).toBeNull())
  })
})

describe('TownPage', () => {
  it('every lot is on the street: open ones, a closed one, and those still being built', async () => {
    await chosenAvatar()
    renderTown()
    expect(await screen.findByRole('button', { name: 'Entra a la Casa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entra a la Botiga' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'La Perruqueria: obrim aviat' })).toBeInTheDocument()
    for (const lot of ['L’Autobús', 'Els Recreatius', 'La Fleca', 'La Granja', 'La Pizzeria', 'El Mercat']) {
      expect(screen.getByRole('button', { name: `${lot}: obrim aviat` })).toBeInTheDocument()
    }
    expect(screen.getByText('Hola, Laia!')).toBeInTheDocument()
  })

  it('street → shop → street, with the HUD on top', async () => {
    await chosenAvatar()
    renderTown()
    await userEvent.click(await screen.findByRole('button', { name: 'Entra a la Botiga' }))
    expect(screen.getByLabelText('0 monedes')).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'La Botiga' }, { timeout: 4000 })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Surt al carrer' }))
    expect(await screen.findByTestId('street')).toBeInTheDocument()
  })

  it('a waiting character’s bubble hangs over the façade; tapping it goes in and the character is already there; solving fills the jar', async () => {
    await chosenAvatar()
    renderTown()
    const bubble = await screen.findByTestId('street-hint-casa')
    expect(bubble).toHaveAttribute('data-waiting', '1')
    expect(screen.queryByTestId('street-hint-perruqueria')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Encàrrecs/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Tarro d’estrelles: 0 %' })).toBeInTheDocument()

    await userEvent.click(within(bubble).getByText('🍳'))
    expect(await screen.findByRole('region', { name: 'La Casa de prova' }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('Pendents: 1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Resol' }))
    await waitFor(() => expect(screen.getByText('Pendents: 0')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Tarro d’estrelles: 10 %' })).toBeInTheDocument()
    expect(useProgress.getState().rewards.missionsDone).not.toContain(todayKey())
  })

  it('ignoring a bubble costs nothing: entering the building by its door works the same', async () => {
    await chosenAvatar()
    renderTown()
    await screen.findByTestId('street-hint-casa')
    await userEvent.click(screen.getByRole('button', { name: 'Entra a la Casa' }))
    expect(await screen.findByRole('region', { name: 'La Casa de prova' }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('Pendents: 1')).toBeInTheDocument()
  })

  it('filling the jar: a surprise gift, free, in her wardrobe; the day counts as done', async () => {
    await chosenAvatar()
    renderTown({ places: [casa] })
    await userEvent.click(await screen.findByRole('button', { name: 'Entra a la Casa' }))
    await screen.findByRole('region', { name: 'La Casa de prova' }, { timeout: 3000 })
    await screen.findByText('Pendents: 1')
    for (let i = 0; i < BOARD_ERRANDS; i++) await userEvent.click(screen.getByRole('button', { name: 'Resol' }))

    const reveal = await screen.findByRole('dialog', { name: 'Sorpresa!' })
    await userEvent.click(within(reveal).getByRole('button', { name: 'Obre el regal' }))
    expect(within(reveal).getByRole('status')).toHaveTextContent(/És per a tu\./)
    const gift = useWorldStore.getState().row?.owned ?? []
    expect(gift).toHaveLength(1)
    expect(useWorldStore.getState().row?.petalsSpent).toBe(0)
    expect(useProgress.getState().rewards.missionsDone).toContain(todayKey())
    await userEvent.click(within(reveal).getByRole('button', { name: 'Que bé!' }))
    expect(screen.queryByRole('dialog', { name: 'Sorpresa!' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Tarro d’estrelles: 100 %' })).toBeInTheDocument()
  })

  it('the avatar bubble opens L’armari, which closes again; the slot can be overridden', async () => {
    await chosenAvatar()
    renderTown()
    await userEvent.click(await screen.findByRole('button', { name: 'El meu armari' }))
    expect(await screen.findByRole('dialog', { name: 'L’armari' }, { timeout: 4000 })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tanca l’armari' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('a wardrobe override is called instead', async () => {
    await chosenAvatar()
    const onWardrobe = vi.fn()
    renderTown({ onWardrobe })
    await userEvent.click(await screen.findByRole('button', { name: 'El meu armari' }))
    expect(onWardrobe).toHaveBeenCalledOnce()
  })

  it('the sticker album and the player switch are one tap away', async () => {
    await chosenAvatar()
    renderTown()
    await userEvent.click(await screen.findByRole('button', { name: 'Laia · Canvia de jugador/a' }))
    expect(screen.getByText('Qui juga?')).toBeInTheDocument()
  })

  it('the HUD opens the album', async () => {
    await chosenAvatar()
    renderTown()
    await userEvent.click(await screen.findByRole('button', { name: 'Àlbum de pegatines' }))
    expect(screen.getByText('L’àlbum')).toBeInTheDocument()
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
})
