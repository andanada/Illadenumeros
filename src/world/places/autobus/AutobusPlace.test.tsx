import { act, cleanup, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import AutobusPlace from './AutobusPlace'
import { place, requestHost } from './index'

// Component tests are slow when the whole suite runs under coverage: wait longer before giving up.
vi.setConfig({ testTimeout: 30_000 })
configure({ asyncUtilTimeout: 6000 })

let db: MatesDb

/** Reduced motion: walking and trips are instant, so the tests drive the world with plain clicks. */
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
const door = (): HTMLElement => screen.getByRole('button', { name: 'la porta de l’autobús' })
const text = (): string => screen.getByTestId('errand-request').textContent ?? ''
const bubble = (): HTMLElement => screen.getByRole('button', { name: /necessita ajuda a l’autobús/ })

function renderBus(pending = 0, skillId?: string, onSolved = vi.fn()) {
  render(<AutobusPlace pending={pending} callSignal={0} onSolved={onSolved} onExit={vi.fn()} {...(skillId ? { forced: { skillId } } : {})} />)
  return onSolved
}

/** The people (not the child, the driver or the pet) you can choose in this room. */
const riders = (): HTMLElement[] => screen.getAllByRole('button', { name: /^Mou / }).filter((b) => !['laia', 'en-jordi', 'nyx'].includes(b.getAttribute('data-switch') ?? ''))

/** Chooses `who` and sends them through the door; the camera stays with the child. */
async function sendThroughDoor(who: HTMLElement): Promise<void> {
  await userEvent.click(who)
  await userEvent.click(door())
  await waitFor(() => expect(actor('laia')).toHaveAttribute('data-selected', 'true'))
}

describe('AutobusPlace: walking through the bus', () => {
  it('shows the bus from inside with the child, the driver at the wheel, the pet and the regulars', () => {
    renderBus()
    expect(screen.getByRole('region', { name: 'Dins l’autobús' })).toBeInTheDocument()
    for (const id of ['laia', 'en-jordi', 'nyx', 'senyora-pilar', 'la-nuria', 'en-pau']) expect(actor(id)).toBeInTheDocument()
    expect(actor('en-jordi')).toHaveAttribute('data-mode', 'sitting')
    expect(actor('senyora-pilar')).toHaveAttribute('data-mode', 'sitting')
  })

  it('she walks to a seat and sits, and gets up again', async () => {
    renderBus()
    await userEvent.click(screen.getByRole('button', { name: 'Seu al seient 4' }))
    await waitFor(() => expect(actor('laia')).toHaveAttribute('data-mode', 'sitting'))
    expect(actor('laia')).toHaveAccessibleName(/asseguda/)
    await userEvent.click(screen.getByRole('button', { name: 'Aixeca’t del seient 4' }))
    await waitFor(() => expect(actor('laia')).toHaveAttribute('data-mode', 'idle'))
  })

  it('holds the pole and presses the stop button', async () => {
    renderBus()
    await userEvent.click(screen.getByRole('button', { name: 'Agafa’t a la barra' }))
    await waitFor(() => expect(actor('laia')).toHaveAttribute('data-mode', 'emoting'))
    await userEvent.click(screen.getByRole('button', { name: 'Prem el botó de parada' }))
    expect(screen.getByRole('button', { name: 'Parada demanada' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('walks the aisle by tapping the floor', async () => {
    renderBus()
    const before = Number(actor('laia').getAttribute('data-x'))
    const floor = screen.getByTestId('stage-floor')
    vi.spyOn(floor, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 600, right: 1000, bottom: 600, x: 0, y: 0, toJSON: () => ({}) })
    await userEvent.pointer({ keys: '[MouseLeft]', target: floor, coords: { clientX: 800, clientY: 540 } })
    await waitFor(() => expect(Math.abs(Number(actor('laia').getAttribute('data-x')) - before)).toBeGreaterThan(0.2))
  })

  it('she steps off at the stop, walks around there and gets back on', async () => {
    renderBus()
    await userEvent.click(door())
    expect(await screen.findByRole('region', { name: 'La parada 1' })).toBeInTheDocument()
    expect(screen.getByTestId('stop-scene')).toBeInTheDocument()
    await userEvent.click(door())
    expect(await screen.findByRole('region', { name: 'Dins l’autobús' })).toBeInTheDocument()
  })
})

describe('AutobusPlace: driving along the road', () => {
  it('the driver drives stop by stop, doors shut while moving, and people wait at the new stop', async () => {
    renderBus()
    const road = screen.getByTestId('road-bus')
    expect(road).toHaveAttribute('data-stop', '1')
    await userEvent.click(screen.getByRole('button', { name: 'Endavant 1 parada' }))
    await waitFor(() => expect(screen.getByTestId('road-bus')).toHaveAttribute('data-stop', '2'))
    await userEvent.click(screen.getByRole('button', { name: 'Endavant 10 parades' }))
    await waitFor(() => expect(screen.getByTestId('road-bus')).toHaveAttribute('data-stop', '12'))
    await userEvent.click(screen.getByRole('button', { name: 'Endarrere 1 parada' }))
    await waitFor(() => expect(screen.getByTestId('road-bus')).toHaveAttribute('data-stop', '11'))
    await userEvent.click(door())
    await screen.findByRole('region', { name: 'La parada 11' })
    expect(riders().length).toBeGreaterThanOrEqual(2)
  })

  it('the bus waits when nobody is at the wheel', async () => {
    renderBus()
    await userEvent.click(screen.getByRole('button', { name: 'Mou en Jordi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aixeca’t del volant' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Endavant 1 parada' })).toBeDisabled())
    expect(screen.getByTestId('drive-why')).toHaveTextContent(/volant/)
  })

  it('the horn, indicators, wipers and night are free toys', async () => {
    renderBus()
    await userEvent.click(screen.getByRole('button', { name: 'Clàxon' }))
    await userEvent.click(screen.getByRole('button', { name: 'Intermitent esquerre' }))
    expect(screen.getByRole('button', { name: 'Intermitent esquerre' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Eixugaparabrises' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fes que sigui de nit' }))
    expect(screen.getByRole('button', { name: 'Fes que sigui de dia' })).toBeInTheDocument()
    expect(await db.attempts.count()).toBe(0)
  })
})

describe('AutobusPlace: things to play with', () => {
  it('carries a case from the stop and puts it on the rack', async () => {
    renderBus()
    await userEvent.click(door())
    await screen.findByRole('region', { name: 'La parada 1' })
    await userEvent.click(document.querySelector<HTMLElement>('[data-uid="maleta"]') as HTMLElement)
    await waitFor(() => expect(actor('laia')).toHaveAccessibleName(/porta la maleta/))
    await userEvent.click(door())
    await screen.findByRole('region', { name: 'Dins l’autobús' })
    expect(actor('laia')).toHaveAccessibleName(/porta la maleta/)
    await userEvent.click(screen.getByRole('button', { name: 'Deixa-ho al portaequipatges' }))
    await waitFor(() => expect(actor('laia')).not.toHaveAccessibleName(/porta la maleta/))
  })

  it('picks up the ball in the aisle and tosses it', async () => {
    renderBus()
    await userEvent.click(document.querySelector<HTMLElement>('[data-uid="pilota"]') as HTMLElement)
    await waitFor(() => expect(actor('laia')).toHaveAccessibleName(/porta la pilota/))
    await userEvent.click(screen.getByRole('button', { name: 'Accions' }))
    await userEvent.click(document.querySelector<HTMLElement>('[data-ring-item="llanca"]') as HTMLElement)
    await waitFor(() => expect(actor('laia')).not.toHaveAccessibleName(/porta la pilota/))
    expect(document.querySelector('[data-uid="pilota"]')).not.toBeNull()
  })

  it('takes the bone from the kiosk and gives it to the pet, who is happy', async () => {
    renderBus()
    await userEvent.click(door())
    await screen.findByRole('region', { name: 'La parada 1' })
    await userEvent.click(document.querySelector<HTMLElement>('[data-uid="os"]') as HTMLElement)
    await waitFor(() => expect(actor('laia')).toHaveAccessibleName(/porta l’os/))
    await waitFor(() => expect(document.querySelector('[data-actor="nyx"]')).not.toBeNull())
    await userEvent.click(actor('nyx'))
    await waitFor(() => expect(actor('nyx')).toHaveAccessibleName(/porta l’os/))
  })
})

describe('AutobusPlace: a passenger needs something (ignorable maths)', () => {
  it('a bubble is only a bubble: nothing opens until she taps it, and «Ara no» lets it go without a record', async () => {
    renderBus(1, 'A6')
    expect(screen.queryByTestId('errand-request')).toBeNull()
    await userEvent.click(bubble())
    expect(screen.getByRole('region', { name: /^Encàrrec a l’Autobús: / })).toHaveAttribute('data-errand-kind', 'seients')
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(screen.queryByTestId('errand-request')).toBeNull()
    expect(await db.attempts.count()).toBe(0)
  })

  it('«en baixen»: walk the passengers off through the door, then close the doors', async () => {
    const onSolved = renderBus(1, 'A6')
    await userEvent.click(bubble())
    const m = /^(\d+) − (\d+): hi ha/.exec(text())
    if (!m) throw new Error(`Encàrrec inesperat: ${text()}`)
    const [a, b] = [Number(m[1]), Number(m[2])]
    expect(riders().length).toBeGreaterThanOrEqual(Math.min(a, 12) - 1)
    for (let i = 0; i < b; i++) await sendThroughDoor(riders()[0] as HTMLElement)
    await userEvent.click(screen.getByRole('button', { name: /Tanca les portes/ }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect((await db.attempts.toArray())[0]).toMatchObject({ gameId: 'poble-autobus', skillId: 'A6', correct: true, hintsUsed: 0 })
    expect(screen.getByTestId('errand-request')).toHaveTextContent(/Et dono 3 monedes/)
    expect(screen.queryByText(/✕|❌/)).toBeNull()
  })

  it('«en pugen»: people wait at the stop; she lets them in through the door', async () => {
    const onSolved = renderBus(1, 'A4')
    await userEvent.click(bubble())
    const m = /^(\d+) \+ (\d+): hi ha/.exec(text())
    if (!m) throw new Error(`Encàrrec inesperat: ${text()}`)
    const b = Number(m[2])
    await userEvent.click(door())
    await screen.findByRole('region', { name: 'La parada 1' })
    for (let i = 0; i < b; i++) {
      await userEvent.click(riders()[0] as HTMLElement)
      await userEvent.click(door())
      await waitFor(() => expect(actor('laia')).toHaveAttribute('data-selected', 'true'))
    }
    await userEvent.click(screen.getByRole('button', { name: /Tanca les portes/ }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
  })

  it('a wrong count only gives a hint and the bus count appears', async () => {
    renderBus(1, 'A6')
    await userEvent.click(bubble())
    await userEvent.click(screen.getByRole('button', { name: /Tanca les portes/ }))
    await waitFor(() => expect(screen.getByTestId('errand-hint').textContent?.length).toBeGreaterThan(0))
    expect(screen.getByText(/^A l’autobús: \d+$/)).toBeInTheDocument()
    expect(screen.queryByText(/✕|❌/)).toBeNull()
  })

  it('«go» on the number line: drive the stops and open the doors at the right one', async () => {
    let m: RegExpExecArray | null = null
    let onSolved = vi.fn()
    for (let i = 0; i < 40 && !m; i++) {
      onSolved = renderBus(1, 'B5')
      await userEvent.click(bubble())
      m = /parada (\d+)\. Vull baixar (\d+) parades (endavant|enrere)/.exec(text())
      if (!m) cleanup()
    }
    if (!m) throw new Error('Cap encàrrec «go»')
    const [start, b, forward] = [Number(m[1]), Number(m[2]), m[3] === 'endavant']
    await waitFor(() => expect(screen.getByTestId('road-bus')).toHaveAttribute('data-stop', String(start)))
    for (let i = 0; i < b; i++) {
      await userEvent.click(screen.getByRole('button', { name: forward ? 'Endavant 1 parada' : 'Endarrere 1 parada' }))
      await waitFor(() => expect(screen.getByTestId('road-bus')).toHaveAttribute('data-driving', 'false'))
    }
    await userEvent.click(screen.getByRole('button', { name: /Obre les portes/ }))
    await waitFor(() => expect(onSolved).toHaveBeenCalled())
    expect((await db.attempts.toArray())[0]).toMatchObject({ skillId: 'B5', correct: true })
  })

  it('«read» keeps its own task (drive to the friend, then hand over the ticket), so every skill stays playable', async () => {
    const onSolved = renderBus(1, 'B2')
    await userEvent.click(bubble())
    expect(text()).toMatch(/parada sense número/)
    for (let i = 0; i < 12 && !screen.queryByRole('list', { name: 'Etiquetes de preu' }); i++) await userEvent.click(screen.getByRole('button', { name: 'Endavant 1 parada' }))
    const stop = screen.getAllByTestId('road-bus').at(-1)?.getAttribute('data-stop') ?? ''
    await userEvent.click(within(screen.getByRole('list', { name: 'Etiquetes de preu' })).getByRole('button', { name: `Resposta ${stop}` }))
    await waitFor(() => expect(onSolved).toHaveBeenCalled())
    expect((await db.attempts.toArray())[0]).toMatchObject({ skillId: 'B2', correct: true })
  })

  it('the board bell opens the first bubble by itself', async () => {
    const { rerender } = render(<AutobusPlace pending={1} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} forced={{ skillId: 'A4' }} />)
    expect(screen.queryByTestId('errand-request')).toBeNull()
    await act(async () => {
      rerender(<AutobusPlace pending={1} callSignal={1} onSolved={vi.fn()} onExit={vi.fn()} forced={{ skillId: 'A4' }} />)
    })
    expect(await screen.findByRole('region', { name: /^Encàrrec a / })).toBeInTheDocument()
  })

  it('nobody is bubbling when nothing is pending', () => {
    renderBus(0)
    expect(screen.queryByRole('button', { name: /necessita ajuda/ })).toBeNull()
  })
})

describe('Autobús module', () => {
  it('is a place open from day one and tells the request system who carries the bubbles', () => {
    expect(place).toMatchObject({ id: 'autobus', gameId: 'poble-autobus', unlock: 'always', facade: 'parada-autobus' })
    expect(place.skills.length).toBeGreaterThan(5)
    expect(requestHost).toMatchObject({ placeId: 'autobus', gameId: 'poble-autobus' })
    expect(requestHost.anchors.map((a) => a.actorId)).toEqual(['senyora-pilar', 'la-nuria', 'en-pau'])
    expect(requestHost.skillIds).toEqual(place.skills)
  })
})
