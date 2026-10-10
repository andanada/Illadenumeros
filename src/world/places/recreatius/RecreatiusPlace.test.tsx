import { configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameProps } from '../../../features/play/gameTypes'
import type { MatesDb } from '../../../core/storage/db'
import { seedLearningAddition } from '../../../games/shared/speed/speedTestUtils'
import { activateTestPlayer } from '../../../test/playerDb'
import { place, requestHost } from './index'
import RecreatiusPlace from './RecreatiusPlace'

// The games themselves are covered by their own tests (and by RecreatiusGames.test.tsx); here a stand-in that
// finishes a round on demand, so the place's own behaviour can be checked.
vi.mock('../../../features/play/gameRegistry', () => {
  function FakeGame({ onExit, onComplete }: GameProps) {
    return (
      <div>
        <button type="button" onClick={onExit}>
          Enrere del joc
        </button>
        <button type="button" onClick={() => onComplete({ answered: 8, correct: 7, petals: 4, masteredSkillIds: [] })}>
          Acaba la ronda
        </button>
      </div>
    )
  }
  return { GAME_REGISTRY: { 'duel-llampec': FakeGame, 'tren-sumes': FakeGame, 'pesca-sumes': FakeGame } }
})

// Component tests are slow when the whole suite runs under coverage: wait longer before giving up.
vi.setConfig({ testTimeout: 30_000 })
configure({ asyncUtilTimeout: 6000 })

let db: MatesDb

/** Reduced motion: walking is instant, so the tests drive the room with plain clicks. */
function mockReducedMotion(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  }))
}

beforeEach(() => {
  db = activateTestPlayer()
  mockReducedMotion()
})
afterEach(() => vi.unstubAllGlobals())

const actor = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-actor="${id}"]`)
  if (!el) throw new Error(`Sense actor ${id}`)
  return el
}
const item = (uid: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-uid="${uid}"]`)
  if (!el) throw new Error(`Sense objecte ${uid}`)
  return el
}

function renderRoom(pending: number, onSolved = vi.fn(), callSignal = 0, forced?: { skillId: string }) {
  const ui = (signal: number) => (
    <MemoryRouter>
      <RecreatiusPlace pending={pending} callSignal={signal} onSolved={onSolved} onExit={vi.fn()} {...(forced ? { forced } : {})} />
    </MemoryRouter>
  )
  const view = render(ui(callSignal))
  return { onSolved, rerender: (signal: number) => view.rerender(ui(signal)) }
}

describe('RecreatiusPlace: the room you walk through', () => {
  it('has three cabinets, the claw machine, the photo booth, the prize counter with ribbons, and people', () => {
    renderRoom(0)
    for (const name of ['Duel Llampec: juga', 'Tren de Sumes: juga', 'Pesca de Sumes: juga', 'La màquina de la grua: juga', 'La cabina de fotos: fes-te una foto'])
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    const ribbons = within(screen.getByRole('list', { name: 'Cintes personals' })).getAllByRole('listitem')
    expect(ribbons.map((r) => r.getAttribute('aria-label'))).toEqual(['Tren de Sumes: Encara no hi ha cinta', 'Pesca de Sumes: Encara no hi ha cinta', 'Duel Llampec: Encara no hi ha cinta'])
    for (const id of ['laia', 'en-kofi', 'en-pau', 'la-mei', 'nyx']) expect(actor(id)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /necessita ajuda/ })).toBeNull()
  })

  it('the pending warm-up lights the Duel as «Escalfament» with a bubble she can ignore', () => {
    renderRoom(1)
    expect(screen.getByRole('button', { name: 'Duel Llampec, escalfament: juga' })).toHaveAttribute('data-warmup', 'true')
    expect(screen.getByRole('button', { name: 'Tren de Sumes: juga' })).toHaveAttribute('data-warmup', 'false')
    expect(screen.getByRole('button', { name: 'Escalfament al Duel Llampec: toca per jugar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /En Kofi necessita/ })).toBeNull()
  })

  it('lights and music are switches, nothing costs coins', async () => {
    renderRoom(0)
    expect(screen.getByTestId('arcade-backdrop')).toHaveAttribute('data-lit', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Apaga els llums' }))
    expect(screen.getByTestId('arcade-backdrop')).toHaveAttribute('data-lit', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Posa música' }))
    expect(screen.getByRole('button', { name: 'Atura la música' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('she walks, sits on a puff and can choose the kids and the clerk', async () => {
    renderRoom(0)
    await userEvent.click(screen.getByRole('button', { name: 'Seu al puf vermell' }))
    await waitFor(() => expect(actor('laia')).toHaveAttribute('data-mode', 'sitting'))
    await userEvent.click(screen.getByRole('button', { name: 'Mou en Kofi' }))
    expect(actor('en-kofi')).toHaveAttribute('data-selected', 'true')
  })
})

describe('RecreatiusPlace: the claw machine', () => {
  it('a toy it drops is a real toy: take it from the tray, carry it and give it to a kid', async () => {
    renderRoom(0)
    expect(document.querySelector('[data-fixture="tray-lock"]')).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'La màquina de la grua: juga' }))
    expect(await screen.findByTestId('claw-screen')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mou la grua a la dreta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Baixa la grua' }))
    await waitFor(() => expect(screen.getByRole('img', { name: /^Grua: 1 premis\. Ho has agafat/ })).toBeInTheDocument(), { timeout: 4000 })
    await userEvent.click(screen.getByRole('button', { name: 'Torna a la sala' }))
    expect(screen.queryByTestId('claw-screen')).toBeNull()
    expect(document.querySelector('[data-fixture="tray-lock"]')).toBeNull()

    await userEvent.click(item('safata'))
    await waitFor(() => expect(item('safata')).toHaveAttribute('data-open', 'true'))
    await userEvent.click(item('premi-osset'))
    await waitFor(() => expect(actor('laia')).toHaveAccessibleName(/porta l’osset/))
    await userEvent.click(actor('la-mei'))
    await waitFor(() => expect(actor('la-mei')).toHaveAccessibleName(/porta l’osset/))
    expect(actor('laia')).not.toHaveAccessibleName(/porta l’osset/)
    expect(screen.queryByText(/✕|❌/)).toBeNull()
  })

  it('the tray stays shut until a toy has been won, and says why', async () => {
    renderRoom(0)
    await userEvent.click(document.querySelector<HTMLElement>('[data-fixture="tray-lock"]') as HTMLElement)
    expect(screen.getByText(/primer guanya un premi/)).toBeInTheDocument()
    expect(item('safata')).toHaveAttribute('data-open', 'false')
  })
})

describe('RecreatiusPlace: photo booth and air hockey', () => {
  it('the booth takes a picture of the chosen character in a funny frame; another one changes the frame', async () => {
    renderRoom(0)
    await userEvent.click(screen.getByRole('button', { name: 'La cabina de fotos: fes-te una foto' }))
    const photo = await screen.findByRole('img', { name: /^Foto de la Laia amb el marc/ })
    const first = photo.getAttribute('data-frame')
    await userEvent.click(screen.getByRole('button', { name: /Una altra/ }))
    expect(screen.getByTestId('photo-overlay').querySelector('[data-frame]')?.getAttribute('data-frame')).not.toBe(first)
    await userEvent.click(screen.getByRole('button', { name: 'Torna a la sala' }))
    expect(screen.queryByTestId('photo-overlay')).toBeNull()
  })

  it('the picture is of whoever she is moving', async () => {
    renderRoom(0)
    await userEvent.click(screen.getByRole('button', { name: 'Mou la Mei' }))
    await userEvent.click(screen.getByRole('button', { name: 'La cabina de fotos: fes-te una foto' }))
    expect(await screen.findByRole('img', { name: /^Foto de la Mei amb el marc/ })).toBeInTheDocument()
  })

  it('picks up a puck and tosses it', async () => {
    renderRoom(0)
    await userEvent.click(item('disc-1'))
    await waitFor(() => expect(actor('laia')).toHaveAccessibleName(/porta el disc/))
    await userEvent.click(screen.getByRole('button', { name: 'Accions' }))
    await userEvent.click(document.querySelector<HTMLElement>('[data-ring-item="llanca"]') as HTMLElement)
    await waitFor(() => expect(actor('laia')).not.toHaveAccessibleName(/porta el disc/))
  })
})

describe('RecreatiusPlace: playing a cabinet', () => {
  it('she walks up, the screen opens, a round ends in a celebration with the coins, and she can leave', async () => {
    renderRoom(0)
    await userEvent.click(screen.getByRole('button', { name: 'Tren de Sumes: juga' }))
    expect(await screen.findByRole('region', { name: 'Tren de Sumes, a la pantalla' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tren de Sumes: juga' })).toBeNull()
    await userEvent.click(await screen.findByRole('button', { name: 'Acaba la ronda' }))
    expect(screen.getByTestId('cabinet-celebration')).toHaveTextContent('Has guanyat 4 monedes!')
    await userEvent.click(screen.getByRole('button', { name: 'Surt de la màquina' }))
    expect(screen.getByRole('button', { name: 'Tren de Sumes: juga' })).toBeInTheDocument()
    expect(actor('laia')).toBeInTheDocument()
  })

  it('the warm-up round ticks off the board; other cabinets and later rounds do not', async () => {
    const { onSolved } = renderRoom(1)
    await userEvent.click(screen.getByRole('button', { name: 'Tren de Sumes: juga' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Acaba la ronda' }))
    expect(onSolved).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Surt de la màquina' }))
    await userEvent.click(screen.getByRole('button', { name: 'Duel Llampec, escalfament: juga' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Acaba la ronda' }))
    expect(onSolved).toHaveBeenCalledTimes(1)
    expect(onSolved).toHaveBeenCalledWith(4)
  })

  it('tapping the warm-up bubble walks her to the Duel', async () => {
    renderRoom(1)
    await userEvent.click(screen.getByRole('button', { name: 'Escalfament al Duel Llampec: toca per jugar' }))
    expect(await screen.findByRole('region', { name: 'Duel Llampec, a la pantalla' })).toBeInTheDocument()
  })

  it('nothing is ticked when the board has no warm-up pending', async () => {
    const { onSolved } = renderRoom(0)
    await userEvent.click(screen.getByRole('button', { name: 'Duel Llampec: juga' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Acaba la ronda' }))
    expect(onSolved).not.toHaveBeenCalled()
  })

  it('the board bell takes her straight to the warm-up cabinet', async () => {
    const { rerender } = renderRoom(1)
    expect(screen.queryByTestId('cabinet-screen')).toBeNull()
    rerender(1)
    expect(await screen.findByRole('region', { name: 'Duel Llampec, a la pantalla' })).toBeInTheDocument()
  })

  it('«Enrere» of the game leaves the cabinet and back in the room', async () => {
    renderRoom(0)
    await userEvent.click(screen.getByRole('button', { name: 'Pesca de Sumes: juga' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Enrere del joc' }))
    expect(screen.getByRole('button', { name: 'Pesca de Sumes: juga' })).toBeInTheDocument()
  })
})

/** Solves the facts the duel can ask at the start: "3 + 5 = ?", "8 + ? = 10", "10 − 4 = ?". */
function solve(text: string): string {
  const missing = /^(\d+) \+ \? = (\d+)$/.exec(text)
  if (missing) return String(Number(missing[2]) - Number(missing[1]))
  const m = /^(\d+) ([+−]) (\d+) = \?$/.exec(text)
  if (!m) throw new Error(`Pregunta inesperada: ${text}`)
  return String(m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]))
}

describe('RecreatiusPlace: the clerk counts prizes (ignorable maths)', () => {
  it('a second need is the clerk\'s bubble; answering with the price tags gives coins and a clean attempt', async () => {
    seedLearningAddition()
    const { onSolved } = renderRoom(2, vi.fn(), 0, { skillId: 'A4' })
    expect(screen.getByRole('button', { name: 'Escalfament al Duel Llampec: toca per jugar' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^En Kofi necessita ajuda amb els premis/ }))
    const request = (await screen.findByTestId('errand-request')).textContent ?? ''
    expect(screen.getByRole('region', { name: /^Encàrrec a els Recreatius: / })).toHaveAttribute('data-errand-kind', 'fichas')
    const tags = within(screen.getByRole('list', { name: 'Etiquetes de preu' }))
    await userEvent.click(tags.getByRole('button', { name: `Resposta ${solve(request.trim())}` }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect((await db.attempts.toArray())[0]).toMatchObject({ gameId: 'duel-llampec', correct: true, hintsUsed: 0 })
    expect(screen.getByTestId('errand-request')).toHaveTextContent(/Et dono 3 monedes/)
    await userEvent.click(screen.getByRole('button', { name: 'Adéu!' }))
    expect(screen.queryByTestId('errand-request')).toBeNull()
  })

  it('«Ara no» lets the clerk go without a record', async () => {
    renderRoom(2, vi.fn(), 0, { skillId: 'A4' })
    await userEvent.click(screen.getByRole('button', { name: /^En Kofi necessita ajuda/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Ara no' }))
    expect(screen.queryByTestId('errand-request')).toBeNull()
    expect(await db.attempts.count()).toBe(0)
  })
})

describe('Recreatius module', () => {
  it('is a place open from day one that serves the duel skills and tells the request system its two bubbles', () => {
    expect(place).toMatchObject({ id: 'recreatius', gameId: 'duel-llampec', unlock: 'always' })
    expect(place.skills).toEqual(expect.arrayContaining(['A4', 'A6', 'C4', 'D2']))
    expect(typeof place.facade).toBe('function')
    expect(requestHost).toMatchObject({ placeId: 'recreatius', gameId: 'duel-llampec', adapters: [] })
    expect(requestHost.anchors.map((a) => a.actorId)).toEqual(['duel', 'en-kofi'])
  })
})
