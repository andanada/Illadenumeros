import { cleanup, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import AutobusPlace from './AutobusPlace'
import { place } from './index'

// Component tests are slow when the whole suite runs under coverage: wait longer before giving up.
vi.setConfig({ testTimeout: 20_000 })
configure({ asyncUtilTimeout: 5000 })

let db: MatesDb

beforeEach(() => {
  db = activateTestPlayer()
})

const request = (): string => screen.getByTestId('errand-request').textContent ?? ''

function renderBus(skillId: string, onSolved = vi.fn(), pending = 1) {
  render(<AutobusPlace pending={pending} callSignal={0} onSolved={onSolved} onExit={vi.fn()} forced={{ skillId }} />)
  return onSolved
}

/** Items are random: a small two-digit sum may ride the seats, so ask again until the road comes up. */
function renderRoad(skillId: string, onSolved = vi.fn()) {
  for (let i = 0; i < 30; i++) {
    renderBus(skillId, onSolved)
    if (screen.getByRole('region', { name: /^Encàrrec a / }).getAttribute('data-errand-kind') === 'parades') return onSolved
    cleanup()
  }
  throw new Error(`Cap encàrrec de carretera per a ${skillId}`)
}

const busLabel = (n: number): RegExp => new RegExp(`^L’autobús: ${n} passatger`)

describe('AutobusPlace: passengers on the seats', () => {
  it('"en pugen": tap-to-place passengers onto the bus, close the doors, coins and a clean attempt', async () => {
    const onSolved = renderBus('A4')
    expect(screen.getByRole('region', { name: /^Encàrrec a l’Autobús: / })).toHaveAttribute('data-errand-kind', 'seients')
    const m = /^(\d+) \+ (\d+): hi ha/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const [a, b] = [Number(m[1]), Number(m[2])]
    expect(screen.getByRole('group', { name: busLabel(a) })).toBeInTheDocument()
    for (let i = 0; i < b; i++) {
      await userEvent.click(screen.getByRole('button', { name: 'Fes pujar el primer de la cua' }))
      await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a l’autobús' }))
    }
    expect(screen.getByRole('group', { name: busLabel(a + b) })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Tanca les portes/ }))

    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3), { timeout: 5000 })
    const attempts = await db.attempts.toArray()
    expect(attempts).toHaveLength(1)
    expect(attempts[0]).toMatchObject({ gameId: 'poble-autobus', skillId: 'A4', correct: true, hintsUsed: 0 })
    expect(useProgress.getState().rewards.petals).toBe(3)
    expect(screen.getByTestId('errand-neighbour')).toHaveAttribute('data-pose', 'cheer')
  })

  it('"en baixen": tapping windows lets passengers off; a wrong count rocks the bus and gives a hint, never a cross', async () => {
    const onSolved = renderBus('A6')
    const m = /^(\d+) − (\d+): hi ha/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const [a, b] = [Number(m[1]), Number(m[2])]
    // First try: nobody gets off (wrong unless b = 0).
    await userEvent.click(screen.getByRole('button', { name: /Tanca les portes/ }))
    await waitFor(() => expect(screen.getByTestId('errand-hint').textContent?.length).toBeGreaterThan(0), { timeout: 5000 })
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    // The hint shows the count on the bus sign; let b passengers off by tapping their windows.
    for (let i = 0; i < b; i++) await userEvent.click(screen.getByRole('button', { name: 'Seient 1, fes baixar el passatger' }))
    expect(screen.getByRole('group', { name: busLabel(a - b) })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: new RegExp(`^A la parada: ${b} passatger`) })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Tanca les portes/ }))
    await waitFor(() => expect(onSolved).toHaveBeenCalled(), { timeout: 5000 })
    const attempts = await db.attempts.toArray()
    expect(attempts.map((x) => x.correct).sort()).toEqual([false, true])
    expect(attempts.find((x) => x.correct)?.hintsUsed).toBeGreaterThan(0)
  })
})

describe('AutobusPlace: driving along the number line', () => {
  it('"go": drive the stops with the pedals and open the doors at the answer', async () => {
    const onSolved = renderRoad('B5')
    expect(screen.getByRole('region', { name: /^Encàrrec a / })).toHaveAttribute('data-errand-kind', 'parades')
    const m = /parada (\d+)\. Vull baixar (\d+) parades (endavant|enrere)/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const b = Number(m[2])
    const forward = m[3] === 'endavant'
    for (let i = 0; i < b; i++)
      await userEvent.click(screen.getByRole('button', { name: forward ? 'Endavant 1 parada' : 'Endarrere 1 parada' }))
    expect(screen.getByTestId('road-bus')).toHaveAttribute('data-stop', String(Number(m[1]) + (forward ? b : -b)))
    await userEvent.click(screen.getByRole('button', { name: /Obre les portes/ }))
    await waitFor(() => expect(onSolved).toHaveBeenCalled(), { timeout: 5000 })
    expect((await db.attempts.toArray())[0]).toMatchObject({ gameId: 'poble-autobus', skillId: 'B5', correct: true })
  })

  it('"read": drive to the friend at an unnumbered stop, then hand over the right ticket', async () => {
    const onSolved = renderBus('B2')
    expect(request()).toMatch(/parada sense número/)
    expect(screen.queryByRole('list', { name: 'Etiquetes de preu' })).toBeNull()
    // Drive one stop at a time until the tickets appear (the friend's stop).
    for (let i = 0; i < 12 && !screen.queryByRole('list', { name: 'Etiquetes de preu' }); i++) {
      await userEvent.click(screen.getByRole('button', { name: 'Endavant 1 parada' }))
    }
    const stop = screen.getByTestId('road-bus').getAttribute('data-stop') ?? ''
    const tickets = within(screen.getByRole('list', { name: 'Etiquetes de preu' }))
    await userEvent.click(tickets.getByRole('button', { name: `Resposta ${stop}` }))
    await waitFor(() => expect(onSolved).toHaveBeenCalled(), { timeout: 5000 })
    expect((await db.attempts.toArray())[0]).toMatchObject({ skillId: 'B2', correct: true })
  })

  it('undo takes the last jump back and the tens pedal moves ten stops', async () => {
    renderRoad('B4')
    const start = Number(screen.getByTestId('road-bus').getAttribute('data-stop'))
    await userEvent.click(screen.getByRole('button', { name: 'Endavant 10 parades' }))
    expect(screen.getByTestId('road-bus')).toHaveAttribute('data-stop', String(start + 10))
    await userEvent.click(screen.getByRole('button', { name: '↶ Desfés' }))
    expect(screen.getByTestId('road-bus')).toHaveAttribute('data-stop', String(start))
  })
})

describe('AutobusPlace: free play and neighbours', () => {
  it('"Ara no" lets the neighbour go without recording; the bell calls the next one', async () => {
    renderBus('A4')
    await userEvent.click(screen.getByRole('button', { name: 'Ajuda' }))
    expect((await screen.findByTestId('errand-hint')).textContent?.length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
    await userEvent.click(screen.getByRole('button', { name: 'Fes venir un veí' }))
    expect(screen.getByRole('region', { name: /^Encàrrec a l’Autobús: / })).toBeInTheDocument()
  })

  it('passengers get on and off when tapped; drive, honk, indicators, wipers and night', async () => {
    renderBus('A4', vi.fn(), 0)
    expect(screen.getByRole('group', { name: busLabel(3) })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Passatger 1 de la cua, fes-lo pujar' }))
    expect(screen.getByRole('group', { name: busLabel(4) })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Seient 1, fes baixar el passatger' }))
    expect(screen.getByRole('group', { name: busLabel(3) })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Arrenca l’autobús' }))
    expect(screen.getByRole('button', { name: 'Para l’autobús' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Para l’autobús' }))
    expect(screen.getByRole('group', { name: /^Parada 2: / })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clàxon' }))
    await userEvent.click(screen.getByRole('button', { name: 'Intermitent esquerre' }))
    expect(screen.getByRole('button', { name: 'Intermitent esquerre' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Eixugaparabrises' }))
    expect(screen.getByRole('button', { name: 'Eixugaparabrises' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Fes que sigui de nit' }))
    expect(screen.getByRole('button', { name: 'Fes que sigui de dia' })).toBeInTheDocument()
    expect(await db.attempts.count()).toBe(0)
  })

  it('the board bell brings a neighbour; the bus cannot drive off during an errand', () => {
    const { rerender } = render(<AutobusPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} forced={{ skillId: 'A4' }} />)
    expect(screen.queryByRole('region', { name: /^Encàrrec a / })).toBeNull()
    rerender(<AutobusPlace pending={0} callSignal={1} onSolved={vi.fn()} onExit={vi.fn()} forced={{ skillId: 'A4' }} />)
    expect(screen.getByRole('region', { name: /^Encàrrec a / })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Arrenca l’autobús' })).toBeDisabled()
  })

  it('is a place module open from day one', () => {
    expect(place).toMatchObject({ id: 'autobus', gameId: 'poble-autobus', unlock: 'always', facade: 'parada-autobus' })
    expect(place.skills.length).toBeGreaterThan(5)
  })
})
