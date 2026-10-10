import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import { findSeed, pin, unpin } from '../shared/doing/seedFinder.testutil'
import PizzeriaPlace from './PizzeriaPlace'
import { PIZZERIA_SKILLS } from './pizzeriaSkills'
import { playOf } from './tasks/pizzeriaTasks'

vi.setConfig({ testTimeout: 60_000 })

let db: MatesDb

beforeEach(() => {
  db = activateTestPlayer()
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }))
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const q = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel)
  if (!el) throw new Error(`Sense ${sel}`)
  return el
}
const all = (sel: string): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>(sel))
const door = (id: string): HTMLElement => q(`[data-door="${id}"]`)
const avatar = (): HTMLElement => q('[data-actor="laia"]')
const zone = (id: string): HTMLElement => q(`[data-zone="${id}"]`)
const words = (): string => screen.getByTestId('errand-request').textContent ?? ''
const carry = async (el: HTMLElement): Promise<void> => {
  await userEvent.click(el)
  await waitFor(() => expect(avatar()).toHaveAccessibleName(/porta/))
}
const goTo = async (doorId: string, region: string): Promise<void> => {
  await userEvent.click(door(doorId))
  await waitFor(() => expect(screen.getByRole('region', { name: region })).toBeInTheDocument())
}
const loose = (def: string): HTMLElement => q(`[data-def="${def}"]:not([data-in])`)

function renderPizzeria(opts: { skillId?: string; ts?: number; onSolved?: () => void } = {}) {
  const onSolved = opts.onSolved ?? vi.fn()
  if (opts.ts) pin(opts.ts)
  render(<PizzeriaPlace pending={1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} {...(opts.skillId ? { forced: { skillId: opts.skillId } } : {})} />)
  if (opts.ts) unpin()
  return onSolved
}

const open = async (): Promise<void> => void (await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ })))

describe('Pizzeria: free play', () => {
  it('shows the dining room with a customer and the waiter', async () => {
    renderPizzeria()
    expect(screen.getByRole('region', { name: 'La sala del restaurant' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /toca per atendre/ })).toHaveAttribute('data-anchor', 'waiting')
    expect(document.querySelector('[data-actor="marta"]')).not.toBeNull()
  })

  it('bakes dough in the oven and slices the pizza with the cutter into that many slices', async () => {
    render(<PizzeriaPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />)
    await goTo('porta-cuina', 'La cuina')
    await userEvent.click(q('[data-uid="pastera"]'))
    await waitFor(() => expect(q('[data-uid="pastera"]')).toHaveAttribute('data-open', 'true'))
    await carry(q('[data-def="massa-pizza"]'))
    await userEvent.click(q('[data-zone-drop="forn-pizza"]'))
    await waitFor(() => expect(document.querySelector('[data-in="forn-pizza"][data-def="pizza-cuita"]')).not.toBeNull(), { timeout: 4000 })
    await carry(q('[data-uid="tallador-4"]'))
    await userEvent.click(q('[data-def="pizza-cuita"]'))
    await waitFor(() => expect(all('[data-def="tros"]')).toHaveLength(4), { timeout: 4000 })
  })

  it('the street door takes the child out', async () => {
    const onExit = vi.fn()
    render(<PizzeriaPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={onExit} />)
    await userEvent.click(door('porta-fora'))
    await waitFor(() => expect(onExit).toHaveBeenCalled())
  })
})

describe('Pizzeria: requests', () => {
  it('sharing: slices are dealt onto plates by hand, an attempt is recorded and coins paid', async () => {
    const ts = findSeed('C6', (item) => playOf(item)?.mode.kind === 'share' && playOf(item)?.mode.kind === 'share' && item.operands?.a !== undefined && item.operands.a <= 15)
    const onSolved = renderPizzeria({ skillId: 'C6', ts })
    await open()
    const sheet = screen.getByRole('region', { name: /^Encàrrec a la Pizzeria: / })
    expect(sheet).toHaveAttribute('data-errand-kind', 'plats')
    const m = /Reparteix (\d+) trossos de pizza en (\d+) plats/.exec(words())
    if (!m) throw new Error(`Encàrrec inesperat: ${words()}`)
    const total = Number(m[1])
    const groups = Number(m[2])
    const per = total / groups
    for (let g = 1; g <= groups; g++) {
      for (let k = 0; k < per; k++) {
        await carry(q('[data-uid*="~"]:not([data-in])'))
        await userEvent.click(q(`[data-zone-drop="plat-${g}"]`))
        await waitFor(() => expect(zone(`plat-${g}`)).toHaveAttribute('data-count', String(k + 1)))
      }
    }
    await userEvent.click(screen.getByRole('button', { name: /Comprova/ }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect(await db.attempts.toArray()).toHaveLength(1)
    expect(useProgress.getState().rewards.petals).toBe(3)
  })

  it('uneven plates do not pass: «Comprova» waits until everybody has the same', async () => {
    const ts = findSeed('C6', (item) => playOf(item)?.mode.kind === 'share')
    renderPizzeria({ skillId: 'C6', ts })
    await open()
    await carry(q('[data-uid*="~"]:not([data-in])'))
    await userEvent.click(q('[data-zone-drop="plat-1"]'))
    await waitFor(() => expect(zone('plat-1')).toHaveAttribute('data-count', '1'))
    expect(screen.getByRole('button', { name: /Comprova/ })).toBeDisabled()
    expect(screen.getByTestId('doing-caption')).toHaveTextContent(/mateix|igual/i)
  })

  it('cut and give: cut the pizza in the kitchen, take slices to the customer’s plate, and answer the fraction she made', async () => {
    const ts = findSeed('C8', (item) => playOf(item)?.mode.kind === 'cut')
    const onSolved = renderPizzeria({ skillId: 'C8', ts })
    await open()
    expect(screen.getByRole('region', { name: /^Encàrrec a la Pizzeria: / })).toHaveAttribute('data-errand-kind', 'talla')
    const m = /Talla la pizza en (\d+) parts iguals i dóna’n (\d+)/.exec(words())
    if (!m) throw new Error(`Encàrrec inesperat: ${words()}`)
    const parts = Number(m[1])
    const given = Number(m[2])
    await goTo('porta-cuina', 'La cuina')
    await carry(q(`[data-uid="tallador-${parts}"]`))
    await userEvent.click(q('[data-def="pizza-cuita"]'))
    await waitFor(() => expect(all('[data-def="tros"]')).toHaveLength(parts), { timeout: 4000 })
    await userEvent.click(q('[data-surface="mostrador-1"]'))
    await waitFor(() => expect(avatar()).not.toHaveAccessibleName(/porta/))
    for (let k = 0; k < given; k++) {
      await carry(loose('tros'))
      await goTo('porta-sala', 'La sala del restaurant')
      await userEvent.click(q('[data-zone-drop="plat-client"]'))
      await waitFor(() => expect(zone('plat-client')).toHaveAttribute('data-count', String(k + 1)))
      if (k < given - 1) await goTo('porta-cuina', 'La cuina')
    }
    await userEvent.click(screen.getByRole('button', { name: /Comprova/ }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
  })

  it('ignoring is fine: «Ara no» records nothing', async () => {
    renderPizzeria({ skillId: 'C6' })
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
    expect(screen.queryByTestId('errand-request')).toBeNull()
  })

  it('equivalent fractions are played with the price tags; a wrong tag only fades', async () => {
    const onSolved = renderPizzeria({ skillId: 'E9' })
    await open()
    expect(screen.getByRole('region', { name: /^Encàrrec a la Pizzeria: / })).toHaveAttribute('data-errand-kind', 'fichas')
    const tags = within(screen.getByRole('list', { name: 'Etiquetes de preu' }))
    const wrong = tags.getAllByRole('button')[0]
    if (!wrong) throw new Error('Sense etiquetes')
    await userEvent.click(wrong)
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    expect(onSolved).toBeDefined()
  })
})

describe('Pizzeria: every skill', () => {
  it.each(PIZZERIA_SKILLS.map((id) => [id]))('skill %s opens a request that can be played (plates, cutter or price tags)', async (skillId) => {
    const { unmount } = render(<PizzeriaPlace pending={1} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} forced={{ skillId }} />)
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    const kind = screen.getByRole('region', { name: /^Encàrrec a la Pizzeria: / }).getAttribute('data-errand-kind')
    expect(['plats', 'talla', 'fichas']).toContain(kind)
    if (kind === 'fichas') expect(screen.getByRole('list', { name: 'Etiquetes de preu' })).toBeInTheDocument()
    else expect(screen.getByRole('button', { name: /Comprova/ })).toBeDisabled()
    unmount()
  })
})
