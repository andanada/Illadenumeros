import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import { grantCoins, placeItem } from '../../data'
import { resetWorldStoreForTest } from '../../data/worldStore'
import CasaPlace from './CasaPlace'
import { decode, isHouseUid } from './house/zones'

vi.setConfig({ testTimeout: 30_000 })

let db: MatesDb

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
  resetWorldStoreForTest()
  mockReducedMotion()
})
afterEach(() => vi.unstubAllGlobals())

const actor = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-actor="${id}"]`)
  if (!el) throw new Error(`Sense personatge ${id}`)
  return el
}
const on = (floor: string, id: string): HTMLElement | null => document.querySelector<HTMLElement>(`[data-floor="${floor}"] [data-actor="${id}"]`)
const item = (uid: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-uid="${uid}"]`)
  if (!el) throw new Error(`Sense objecte ${uid}`)
  return el
}
const stair = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-stair="${id}"]`)
  if (!el) throw new Error(`Sense escala ${id}`)
  return el
}

/** She steps off the stairs a moment after arriving. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 250))

async function house() {
  render(<CasaPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />)
  // The first visit furnishes the house with the free starter pieces.
  await waitFor(() => expect(document.querySelector('[data-placed="llit"]')).not.toBeNull())
}

/** Pages the catalogue until the card of `name` shows, and returns it. */
async function cardOf(name: string): Promise<HTMLElement> {
  const catalogue = screen.getByRole('region', { name: 'Catàleg de mobles' })
  for (let i = 0; i < 10; i++) {
    const card = within(catalogue).queryByText(name, { selector: 'p' })?.closest('li')
    if (card) return card
    await userEvent.click(within(catalogue).getByRole('button', { name: 'Més mobles' }))
  }
  throw new Error(`Sense targeta ${name}`)
}

describe('Casa: a dollhouse to live in', () => {
  it('shows three floors with the child, the family and the pet each on their floor', async () => {
    await house()
    for (const floor of ['Planta baixa', 'Primer pis', 'Golfes']) expect(screen.getByRole('region', { name: floor })).toBeInTheDocument()
    await waitFor(() => expect(on('pis', 'pare')).not.toBeNull())
    expect(on('baixa', 'jo')).not.toBeNull()
    expect(on('baixa', 'iaia')).not.toBeNull()
    expect(on('golfes', 'germana')).not.toBeNull()
    expect(actor('jo')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByRole('group', { name: 'Qui mous?' })).toBeInTheDocument()
  })

  it('she walks up the stairs floor by floor and back down', async () => {
    await house()
    await userEvent.click(stair('escala-baixa-up'))
    await waitFor(() => expect(on('pis', 'jo')).not.toBeNull())
    await settle()
    await userEvent.click(stair('escala-pis-up'))
    await waitFor(() => expect(on('golfes', 'jo')).not.toBeNull())
    await settle()
    await userEvent.click(stair('escala-golfes-down'))
    await waitFor(() => expect(on('pis', 'jo')).not.toBeNull())
  })

  it('she takes fruit from the fridge and carries it up two floors', async () => {
    await house()
    await userEvent.click(item('nevera'))
    await waitFor(() => expect(item('nevera')).toHaveAttribute('data-open', 'true'))
    await userEvent.click(item('poma-1'))
    await waitFor(() => expect(actor('jo')).toHaveAccessibleName(/porta la poma/))
    await userEvent.click(stair('escala-baixa-up'))
    await waitFor(() => expect(on('pis', 'jo')).not.toBeNull())
    await settle()
    await userEvent.click(stair('escala-pis-up'))
    await waitFor(() => expect(on('golfes', 'jo')).not.toBeNull())
    await settle()
    expect(actor('jo')).toHaveAccessibleName(/porta la poma/)
  })

  it('she serves a dish to the grandma, who takes it and reacts', async () => {
    await house()
    await userEvent.click(item('nevera'))
    await waitFor(() => expect(item('nevera')).toHaveAttribute('data-open', 'true'))
    await userEvent.click(item('poma-1'))
    await waitFor(() => expect(actor('jo')).toHaveAccessibleName(/porta la poma/))
    await userEvent.click(actor('iaia'))
    await waitFor(() => expect(actor('iaia')).toHaveAccessibleName(/porta la poma/))
    expect(actor('jo')).not.toHaveAccessibleName(/porta/)
  })

  it('the bath has a chain: the bucket fills the tub', async () => {
    await house()
    await userEvent.click(stair('escala-baixa-up'))
    await waitFor(() => expect(on('pis', 'jo')).not.toBeNull())
    await settle()
    await userEvent.click(item('galleda'))
    await waitFor(() => expect(actor('jo')).toHaveAccessibleName(/porta la galleda/))
    await userEvent.click(item('banyera'))
    await waitFor(() => expect(item('banyera')).toHaveAttribute('data-stage', 'plena d’aigua'))
  })

  it('night dims every floor until its own light is switched on', async () => {
    await house()
    await userEvent.click(screen.getByRole('button', { name: 'Fes de nit' }))
    expect(screen.getByTestId('nit-baixa')).toHaveAttribute('data-dark', 'true')
    expect(screen.getByTestId('nit-pis')).toHaveAttribute('data-dark', 'true')
    await userEvent.click(screen.getByRole('button', { name: /Llum de planta baixa/ }))
    expect(screen.getByTestId('nit-baixa')).toHaveAttribute('data-dark', 'false')
    expect(screen.getByTestId('nit-pis')).toHaveAttribute('data-dark', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Fes de dia' }))
    expect(screen.getByTestId('nit-pis')).toHaveAttribute('data-dark', 'false')
  })

  it('sitting on the bed offers to go to sleep', async () => {
    await house()
    await userEvent.click(stair('escala-baixa-up'))
    await waitFor(() => expect(on('pis', 'jo')).not.toBeNull())
    await settle()
    await userEvent.click(await screen.findByRole('button', { name: 'Seu al llit' }))
    await waitFor(() => expect(actor('jo')).toHaveAttribute('data-mode', 'sitting'))
    await userEvent.click(screen.getByRole('button', { name: /A dormir/ }))
    expect(screen.getByTestId('nit-pis')).toHaveAttribute('data-dark', 'true')
  })
})

describe('Casa: decorating does not block play', () => {
  it('a paid piece needs coins first, then it is bought, placed and kept', async () => {
    await house()
    await userEvent.click(screen.getByRole('button', { name: 'Decora' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mobles' }))
    const catalogue = screen.getByRole('region', { name: 'Catàleg de mobles' })
    const card = await cardOf('Sofà')
    await userEvent.click(within(card).getByRole('button', { name: /Compra el sofà per 45 monedes/ }))
    expect(await within(catalogue).findByText(/Et falten 45 monedes/)).toBeInTheDocument()
    await grantCoins(60, 'test')
    await userEvent.click(within(card).getByRole('button', { name: /Compra el sofà per 45 monedes/ }))
    expect(await within(catalogue).findByText(/Has comprat el sofà/)).toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Posa’l' }))
    await waitFor(() => expect(document.querySelector('[data-placed="sofa"]')).not.toBeNull())
    const stored = await db.world.get('world')
    expect(stored?.placed.casa?.some((p) => p.item === 'sofa' && isHouseUid(p.uid))).toBe(true)
    expect(stored?.petalsSpent).toBe(45)
  })

  it('tapping a piece opens its tools: move, flip, put away', async () => {
    await house()
    await userEvent.click(screen.getByRole('button', { name: 'Decora' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Coixí' }))
    const toolbar = screen.getByRole('toolbar', { name: /Què fem amb/ })
    const cushion = (await db.world.get('world'))?.placed.casa?.find((p) => p.item === 'coixi')
    await userEvent.click(within(toolbar).getByRole('button', { name: 'Mou-ho a la dreta' }))
    await userEvent.click(within(toolbar).getByRole('button', { name: /Gira/ }))
    await waitFor(async () => {
      const now = (await db.world.get('world'))?.placed.casa?.find((p) => p.item === 'coixi')
      expect(now?.x).toBeGreaterThan(cushion?.x ?? 1)
      expect(now?.flip).toBe(true)
      expect(decode(now ?? { uid: 'h', x: 0, y: 0 }).zone).toBe('estudi')
    })
    await userEvent.click(within(toolbar).getByRole('button', { name: /Guarda/ }))
    await waitFor(() => expect(document.querySelector('[data-placed="coixi"]')).toBeNull())
  })

  it('a piece from the old three-room home keeps its room and is rewritten for the house', async () => {
    await placeItem('casa', { uid: 'mold', item: 'coixi', x: 0.6, y: 0.85, z: 0 })
    render(<CasaPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />)
    await waitFor(async () => {
      const list = (await db.world.get('world'))?.placed.casa ?? []
      expect(list.some((p) => p.uid === 'mold')).toBe(false)
      const moved = list.find((p) => p.item === 'coixi')
      expect(moved && isHouseUid(moved.uid)).toBe(true)
      expect(moved && decode(moved).zone).toBe('habitacio')
    })
  })

  it('a lamp switches on and off while she plays', async () => {
    await house()
    await userEvent.click(screen.getByRole('button', { name: 'Decora' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mobles' }))
    await grantCoins(60, 'test')
    const card = await cardOf('Làmpada de peu')
    await userEvent.click(within(card).getByRole('button', { name: /Compra la làmpada de peu/ }))
    await userEvent.click(await within(card).findByRole('button', { name: 'Posa’l' }))
    await userEvent.click(within(screen.getByRole('toolbar', { name: 'Casa' })).getByRole('button', { name: 'Fet' }))
    await userEvent.click(await screen.findByRole('button', { name: /^Làmpada de peu, apagat: encén-la/ }))
    expect(screen.getByRole('button', { name: /^Làmpada de peu, encès: apaga-la/ })).toBeInTheDocument()
  })
})
