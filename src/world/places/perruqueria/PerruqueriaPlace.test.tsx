import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import PerruqueriaPlace from './PerruqueriaPlace'

// Many taps per test: a loaded machine (the whole suite in parallel) needs more than the default 5 s.
vi.setConfig({ testTimeout: 40_000 })

let db: MatesDb

beforeEach(() => {
  db = activateTestPlayer()
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }))
})
afterEach(() => vi.unstubAllGlobals())

const q = (selector: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) throw new Error(`No trobo ${selector}`)
  return el
}
const tool = (id: string): HTMLElement => q(`[data-uid="eina-${id}"]`)
const spot = (id: string): HTMLElement => q(`[data-surface="${id}"]`)
const request = (): string => screen.getByTestId('errand-request').textContent ?? ''

function renderSalon(opts: { pending?: number; skillId?: string; onSolved?: () => void } = {}) {
  const onSolved = opts.onSolved ?? vi.fn()
  render(<PerruqueriaPlace pending={opts.pending ?? 1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} {...(opts.skillId ? { forced: { skillId: opts.skillId } } : {})} />)
  return onSolved
}

/** Takes a tool and puts it down on the customer's chair. */
async function useOnChair(name: string, chair = 'eina-cadira-1'): Promise<void> {
  await userEvent.click(tool(name))
  await waitFor(() => expect(q('[data-actor="laia"]')).toHaveAccessibleName(/porta/))
  await userEvent.click(spot(chair))
  await waitFor(() => expect(q('[data-actor="laia"]')).not.toHaveAccessibleName(/porta/))
}

const status = (): HTMLElement => screen.getAllByRole('status').find((s) => s.className.includes('sr-only')) as HTMLElement

describe('Perruqueria: free play', () => {
  it('has two chairs, a basin, a sofa, the stylist, and the asking customer sits in chair 1', () => {
    renderSalon()
    expect(screen.getByRole('region', { name: 'La Perruqueria' })).toBeInTheDocument()
    expect(q('[data-actor="la-nuria"]')).toBeInTheDocument()
    for (const seat of ['cadira-1', 'cadira-2', 'rentapaus', 'sofa-1', 'sofa-2']) expect(q(`[data-seat="${seat}"]`)).toBeInTheDocument()
    expect(q('[data-actor="la-fatima"]')).toHaveAttribute('data-mode', 'sitting')
    expect(screen.getByTestId('mirall')).toHaveAccessibleName(/La Fàtima/)
  })

  it('uses the tools in a chain: out of order only says what comes first, in order the customer reacts', async () => {
    renderSalon()
    await useOnChair('tisores')
    await waitFor(() => expect(status()).toHaveTextContent('Abans toca pentinar-lo'))
    await useOnChair('dutxa')
    await waitFor(() => expect(status()).toHaveTextContent('Quina aigua més bona'))
    await useOnChair('pinta')
    await useOnChair('tisores')
    await waitFor(() => expect(status()).toHaveTextContent('Cris, cris'))
    expect(document.querySelector('[data-actor="la-fatima"] [data-emote]')).not.toBeNull()
  })

  it('the mirror shows the new look after the last step', async () => {
    renderSalon()
    const before = q('[data-testid="mirall"]').innerHTML
    for (const t of ['dutxa', 'pinta', 'tisores', 'esprai']) await useOnChair(t)
    await waitFor(() => expect(q('[data-testid="mirall"]').innerHTML).not.toBe(before))
  })

  it('a tool on an empty chair says there is nobody, nothing breaks', async () => {
    renderSalon()
    await useOnChair('dutxa', 'eina-cadira-2')
    await waitFor(() => expect(status()).toHaveTextContent('No hi ha ningú'))
  })

  it('the child can sit another character on the sofa with the keyboard path (select + seat)', async () => {
    renderSalon()
    await userEvent.click(screen.getByRole('button', { name: 'Mou la Núria' }))
    await userEvent.click(q('[data-seat="sofa-1"]'))
    await waitFor(() => expect(q('[data-actor="la-nuria"]')).toHaveAttribute('data-mode', 'sitting'))
  })
})

const clips = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-def="pinca"]')).filter((e) => !e.hasAttribute('data-in'))
const side = (zone: string): number => Number(q(`[data-zone="${zone}"]`).getAttribute('data-count'))

/** Takes one clip from the box and puts it on a side of the head: tap the clip, then tap the side. */
async function clipOn(zone: 'pinces-esq' | 'pinces-dre'): Promise<void> {
  const piece = clips()[0]
  if (!piece) throw new Error('La caixa és buida')
  const before = side(zone)
  await userEvent.click(piece)
  await userEvent.click(await screen.findByRole('button', { name: zone === 'pinces-esq' ? 'Deixa-ho al costat esquerre' : 'Deixa-ho al costat dret' }))
  await waitFor(() => expect(side(zone)).toBe(before + 1))
}

describe('Perruqueria: the clips wish, done on the customer’s head', () => {
  it('two groups of clips from the box onto the two sides of her head, then «Ja està!»: attempt recorded, coins, hand-over', async () => {
    const onSolved = renderSalon({ skillId: 'A7' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    const card = screen.getByRole('region', { name: /^Encàrrec a la Perruqueria: / })
    expect(card).toHaveAttribute('data-errand-kind', 'pinces')
    const m = /: (\d+) \+ (\d+)\./.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const [a, b] = [Number(m[1]), Number(m[2])]
    await waitFor(() => expect(clips()).toHaveLength(a + b + 2))
    expect(screen.getByRole('button', { name: 'Ja està!' })).toBeDisabled()
    for (let i = 0; i < a; i++) await clipOn('pinces-esq')
    for (let i = 0; i < b; i++) await clipOn('pinces-dre')
    expect([side('pinces-esq'), side('pinces-dre')]).toEqual([a, b])
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect(await db.attempts.toArray()).toHaveLength(1)
    expect(useProgress.getState().rewards.petals).toBe(3)
    await waitFor(() => expect(document.querySelectorAll('[data-in^="pinces-"]')).toHaveLength(0))
    await userEvent.click(screen.getByRole('button', { name: 'Adéu!' }))
    expect(screen.queryByTestId('errand-request')).toBeNull()
  })

  it('«ja porto 4 i en vull 8»: the clips she already wears are on her head and cannot be taken off; she adds the rest', async () => {
    const onSolved = renderSalon({ skillId: 'A10' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    const m = /Ja porto (\d+) \S+ i en vull (\d+)/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const worn = Number(m[1])
    await waitFor(() => expect(document.querySelectorAll('[data-def="pinca-ja"]')).toHaveLength(worn))
    await userEvent.click(q('[data-def="pinca-ja"]'))
    expect(document.querySelectorAll('[data-def="pinca-ja"]')).toHaveLength(worn)
    for (let i = 0; i < Number(m[2]) - worn; i++) await clipOn(i % 2 === 0 ? 'pinces-esq' : 'pinces-dre')
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
  })

  it('a wrong count sends the clips back to the box with a hint (no red), and a helped answer is not clean', async () => {
    const onSolved = renderSalon({ skillId: 'A7' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    const m = /: (\d+) \+ (\d+)\./.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const total = Number(m[1]) + Number(m[2])
    await waitFor(() => expect(clips()).toHaveLength(total + 2))
    await clipOn('pinces-esq')
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    expect((await screen.findByTestId('errand-hint')).textContent?.length).toBeGreaterThan(0)
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    await waitFor(() => expect(clips()).toHaveLength(total + 2))
    expect(side('pinces-esq')).toBe(0)
    for (let i = 0; i < total; i++) await clipOn(i % 2 === 0 ? 'pinces-esq' : 'pinces-dre')
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(1))
    expect((await db.attempts.toArray()).map((x) => x.correct).sort()).toEqual([false, true])
  })

  it('the keyboard puts a clip on her head (Enter on the clip, Enter on the side) and the pieces are big enough to touch', async () => {
    renderSalon({ skillId: 'A7' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    await waitFor(() => expect(clips().length).toBeGreaterThan(0))
    for (const c of clips()) expect(Number.parseFloat(c.style.width)).toBeGreaterThanOrEqual(64)
    clips()[0]?.focus()
    await userEvent.keyboard('{Enter}')
    const drop = await screen.findByRole('button', { name: 'Deixa-ho al costat esquerre' })
    drop.focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(side('pinces-esq')).toBe(1))
    expect(Array.from(document.querySelectorAll('[role="status"]')).some((e) => /Has posat una pinça al costat esquerre: ara hi ha 1\./.test(e.textContent ?? ''))).toBe(true)
  })

  it('ignoring is fine: «Ara no» records nothing and the box is tidied away', async () => {
    renderSalon({ skillId: 'A7' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    await waitFor(() => expect(clips().length).toBeGreaterThan(0))
    await userEvent.click(screen.getByRole('button', { name: 'Ajuda' }))
    expect((await screen.findByTestId('errand-hint')).textContent?.length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
    await waitFor(() => expect(document.querySelectorAll('[data-def^="pinca"]')).toHaveLength(0))
  })
})
