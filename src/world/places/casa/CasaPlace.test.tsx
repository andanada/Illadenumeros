import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import { grantCoins } from '../../data'
import { resetWorldStoreForTest } from '../../data/worldStore'
import CasaPlace from './CasaPlace'

// Many taps per test: a loaded machine (the whole suite in parallel) needs more than the default 5 s.
vi.setConfig({ testTimeout: 30_000 })

let db: MatesDb

beforeEach(() => {
  db = activateTestPlayer()
  resetWorldStoreForTest()
})

const request = (): string => screen.getByTestId('errand-request').textContent ?? ''

function renderKitchen(skillId: string, onSolved = vi.fn()) {
  render(<CasaPlace pending={1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} forced={{ skillId }} />)
  return onSolved
}

const jar = (stage: HTMLElement): HTMLElement => {
  const el = stage.querySelector<HTMLElement>('[data-prop-kind="ingredient-pot"]')
  if (!el) throw new Error('Sense pot')
  return el
}

describe('Casa kitchen errands', () => {
  it('a sum errand is solved by tap-to-place into the bowl: attempt recorded, coins, cheer', async () => {
    const onSolved = renderKitchen('A8')
    const stage = await screen.findByRole('region', { name: /^Encàrrec a la Casa/ })
    expect(stage).toHaveAttribute('data-errand-kind', 'bol')
    const m = /: (\d+) \+ (\d+) /.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const total = Number(m[1]) + Number(m[2])
    for (let i = 0; i < total; i++) {
      await userEvent.click(jar(stage))
      await userEvent.click(screen.getByRole('button', { name: 'Posa-ho al bol' }))
    }
    expect(screen.getByRole('img', { name: new RegExp(`^Bol: ${total} `) })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    const attempts = await db.attempts.toArray()
    expect(attempts).toHaveLength(1)
    expect(attempts[0]).toMatchObject({ gameId: 'poble-casa', skillId: 'A8', correct: true, hintsUsed: 0 })
    expect(useProgress.getState().rewards.petals).toBe(3)
    expect(screen.getByTestId('errand-request')).toHaveTextContent(/Moltes gràcies!.*3 monedes/)
    expect(screen.getByTestId('errand-neighbour')).toHaveAttribute('data-pose', 'cheer')
    // The next cook starts with an empty bowl.
    await userEvent.click(screen.getByRole('button', { name: 'Adéu!' }))
    expect(await screen.findByRole('img', { name: /^Bol: (0|\d+) / })).toBeInTheDocument()
  })

  it('a friends-of-ten errand starts with some in the bowl and only the missing ones are added', async () => {
    const onSolved = renderKitchen('A5')
    const stage = await screen.findByRole('region', { name: /^Encàrrec a la Casa/ })
    const m = /ja n’hi ha (\d+): \d+ \+ \? = (\d+)/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    expect(screen.getByRole('img', { name: new RegExp(`^Bol: ${m[1]} `) })).toBeInTheDocument()
    for (let i = 0; i < Number(m[2]) - Number(m[1]); i++) {
      await userEvent.click(jar(stage))
      await userEvent.click(screen.getByRole('button', { name: 'Posa-ho al bol' }))
    }
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect((await db.attempts.toArray())[0]).toMatchObject({ skillId: 'A5', correct: true })
  })

  it('a wrong bowl bounces gently with a hint, and a helped answer is not clean', async () => {
    const onSolved = renderKitchen('A4')
    const stage = await screen.findByRole('region', { name: /^Encàrrec a la Casa/ })
    await userEvent.click(jar(stage))
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho al bol' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    expect((await screen.findByTestId('errand-hint')).textContent?.length).toBeGreaterThan(0)
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    expect(onSolved).not.toHaveBeenCalled()
    const m = /: (\d+) \+ (\d+) /.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const total = Number(m[1]) + Number(m[2])
    for (let i = 0; i < total - 1; i++) {
      await userEvent.click(jar(stage))
      await userEvent.click(screen.getByRole('button', { name: 'Posa-ho al bol' }))
    }
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(1))
    const attempts = await db.attempts.toArray()
    expect(attempts.map((a) => a.correct).sort()).toEqual([false, true])
    expect(attempts.find((a) => a.correct)?.hintsUsed).toBeGreaterThan(0)
  })

  it('"Ajuda" makes the neighbour say the hint, and "Ara no" lets them go without recording', async () => {
    renderKitchen('A7')
    await screen.findByRole('region', { name: /^Encàrrec a la Casa/ })
    await userEvent.click(screen.getByRole('button', { name: 'Ajuda' }))
    expect((await screen.findByTestId('errand-hint')).textContent?.length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
    expect(screen.queryByRole('region', { name: /^Encàrrec a la Casa/ })).toBeNull()
  })

  it('the neighbour is named in the region and the rest wait at the kitchen door', async () => {
    render(<CasaPlace pending={3} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} forced={{ skillId: 'A4' }} />)
    const stage = await screen.findByRole('region', { name: 'Encàrrec a la Casa: Senyora Pilar' })
    expect(within(stage).getByRole('img', { name: 'Senyora Pilar' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '2 veïns esperen a la porta' })).toBeInTheDocument()
  })
})

/** Pages the catalogue until the card of `name` shows, and returns it. */
async function cardOf(name: string): Promise<HTMLElement> {
  const catalogue = screen.getByRole('region', { name: 'Catàleg de mobles' })
  for (let i = 0; i < 10; i++) {
    const found = within(catalogue).queryByText(name, { selector: 'p' })
    const card = found?.closest('li')
    if (card) return card
    await userEvent.click(within(catalogue).getByRole('button', { name: 'Més mobles' }))
  }
  throw new Error(`Sense targeta ${name}`)
}

describe('Casa free play', () => {
  const home = async () => {
    render(<CasaPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />)
    // The first visit furnishes the house with the free starter pieces.
    await waitFor(() => expect(document.querySelector('[data-placed="coixi"]')).not.toBeNull())
  }

  it('starts furnished, with three rooms to switch between', async () => {
    await home()
    expect(document.querySelector('[data-room="sala"]')).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'L’habitació' }))
    expect(document.querySelector('[data-room="habitacio"] [data-placed="llit"]')).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'La cuina' }))
    expect(document.querySelector('[data-room="cuina"] [data-placed="cadira"]')).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'La sala' }))
    expect(document.querySelector('[data-room="sala"] [data-placed="coixi"]')).not.toBeNull()
  })

  it('a paid piece needs coins: kind message first, then it can be bought and placed (and stays after reload)', async () => {
    await home()
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
    expect(stored?.placed.casa?.some((p) => p.item === 'sofa')).toBe(true)
    expect(stored?.petalsSpent).toBe(45)
  })

  it('tapping a piece opens its tools: move, flip, put away', async () => {
    await home()
    await userEvent.click(await screen.findByRole('button', { name: 'Coixí' }))
    const toolbar = screen.getByRole('toolbar')
    const before = await db.world.get('world')
    const cushion = before?.placed.casa?.find((p) => p.item === 'coixi')
    await userEvent.click(within(toolbar).getByRole('button', { name: 'Mou-ho a la dreta' }))
    await userEvent.click(within(toolbar).getByRole('button', { name: /Gira/ }))
    await waitFor(async () => {
      const now = (await db.world.get('world'))?.placed.casa?.find((p) => p.item === 'coixi')
      expect(now?.x).toBeGreaterThan(cushion?.x ?? 1)
      expect(now?.flip).toBe(true)
    })
    await userEvent.click(within(toolbar).getByRole('button', { name: /Guarda/ }))
    await waitFor(() => expect(document.querySelector('[data-placed="coixi"]')).toBeNull())
  })

  it('the bed puts her to sleep: night mode with z’s, "Bon dia!" wakes her', async () => {
    await home()
    await userEvent.click(screen.getByRole('button', { name: 'L’habitació' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Llit' }))
    await userEvent.click(within(screen.getByRole('toolbar')).getByRole('button', { name: /A dormir/ }))
    expect(screen.getByTestId('casa-nit')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Bon dia!' }))
    expect(screen.queryByTestId('casa-nit')).toBeNull()
  })

  it('a lamp switches on and off', async () => {
    await home()
    await userEvent.click(screen.getByRole('button', { name: 'Mobles' }))
    await grantCoins(60, 'test')
    const card = await cardOf('Làmpada de peu')
    await userEvent.click(within(card).getByRole('button', { name: /Compra la làmpada de peu/ }))
    await userEvent.click(await within(card).findByRole('button', { name: 'Posa’l' }))
    await userEvent.click(await screen.findByRole('button', { name: /^Làmpada de peu, apagat/ }))
    await userEvent.click(within(screen.getByRole('toolbar')).getByRole('button', { name: /Encén/ }))
    expect(screen.getByRole('button', { name: /^Làmpada de peu, encès/ })).toBeInTheDocument()
  })
})
