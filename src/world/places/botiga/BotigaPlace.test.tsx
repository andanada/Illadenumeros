import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import BotigaPlace from './BotigaPlace'

vi.setConfig({ testTimeout: 30_000 })

let db: MatesDb

function mockReducedMotion(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }))
}

beforeEach(() => {
  db = activateTestPlayer()
  mockReducedMotion()
})
afterEach(() => vi.unstubAllGlobals())

const uid = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-uid="${id}"]`)
  if (!el) throw new Error(`Sense objecte ${id}`)
  return el
}
const door = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-door="${id}"]`)
  if (!el) throw new Error(`Sense porta ${id}`)
  return el
}
const surface = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-surface="${id}"]`)
  if (!el) throw new Error(`Sense lloc ${id}`)
  return el
}
const avatar = (): HTMLElement => document.querySelector<HTMLElement>('[data-actor="laia"]') as HTMLElement
const request = (): string => screen.getByTestId('errand-request').textContent ?? ''

function renderShop(opts: { pending?: number; skillId?: string; onSolved?: () => void } = {}) {
  const onSolved = opts.onSolved ?? vi.fn()
  render(<BotigaPlace pending={opts.pending ?? 1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} {...(opts.skillId ? { forced: { skillId: opts.skillId } } : {})} />)
  return onSolved
}

/** Walks the avatar to the back room and opens the crate of apples, then takes one. */
async function fetchApple(): Promise<void> {
  await userEvent.click(door('porta-rebotiga'))
  await waitFor(() => expect(screen.getByRole('region', { name: 'La trastienda' })).toBeInTheDocument())
  await userEvent.click(uid('caixa-pomes'))
  await waitFor(() => expect(uid('caixa-pomes')).toHaveAttribute('data-open', 'true'))
  await userEvent.click(document.querySelector<HTMLElement>('[data-def="poma"]') as HTMLElement)
  await waitFor(() => expect(avatar()).toHaveAccessibleName(/porta la poma/))
  await userEvent.click(door('porta-botiga'))
  await waitFor(() => expect(screen.getByRole('region', { name: 'La botiga' })).toBeInTheDocument())
}

describe('Botiga: free play', () => {
  it('shows the shop with the shopkeeper and the cat, and a customer waiting with a bubble', async () => {
    renderShop()
    expect(screen.getByRole('region', { name: 'La botiga' })).toBeInTheDocument()
    expect(document.querySelector('[data-actor="senyora-pilar"]')).not.toBeNull()
    expect(document.querySelector('[data-actor="mixa"]')).toHaveAttribute('data-mode', 'sitting')
    const bubble = await screen.findByRole('button', { name: /toca per atendre/ })
    expect(bubble).toHaveAttribute('data-anchor', 'waiting')
  })

  it('carries an apple from the back room to a shelf slot', async () => {
    renderShop({ pending: 0 })
    await fetchApple()
    await userEvent.click(surface('prestatge-3-1'))
    await waitFor(() => expect(avatar()).not.toHaveAccessibleName(/porta/))
    expect(uid('poma-a')).toBeInTheDocument()
  })

  it('weighs an apple on the scale: it shows the grams', async () => {
    renderShop({ pending: 0 })
    expect(screen.getByRole('status', { name: 'Bàscula: 0 g' })).toBeInTheDocument()
    await fetchApple()
    await userEvent.click(surface('bascula-1'))
    expect(await screen.findByRole('status', { name: 'Bàscula: 150 g' })).toBeInTheDocument()
  })

  it('scans on the till: the total shows', async () => {
    renderShop({ pending: 0 })
    expect(screen.getByRole('status', { name: 'Caixa: 0 €' })).toBeInTheDocument()
    await fetchApple()
    await userEvent.click(surface('caixa-1'))
    expect(await screen.findByRole('status', { name: /^Caixa: 0,50 €/ })).toBeInTheDocument()
  })

  it('the street door takes the child out', async () => {
    const onExit = vi.fn()
    render(<BotigaPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={onExit} />)
    await userEvent.click(door('porta-fora'))
    await waitFor(() => expect(onExit).toHaveBeenCalled())
  })
})

describe('Botiga: wishes of the customers', () => {
  it('a basket wish solved by tap-to-place records an attempt and gives coins', async () => {
    const onSolved = renderShop({ skillId: 'A4' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    const sheet = screen.getByRole('region', { name: /^Encàrrec a la Botiga: / })
    expect(sheet).toHaveAttribute('data-errand-kind', 'cistella')
    const m = /Vull (\d+) \+ (\d+)/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const total = Number(m[1]) + Number(m[2])
    for (let i = 0; i < total; i++) {
      await userEvent.click(within(sheet).getByRole('button', { name: /^la |^el / }))
      await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a la cistella' }))
    }
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect(await db.attempts.toArray()).toHaveLength(1)
    expect(useProgress.getState().rewards.petals).toBe(3)
    expect(screen.getByTestId('errand-request')).toHaveTextContent(/Moltes gràcies!.*3 monedes/)
    await userEvent.click(screen.getByRole('button', { name: 'Adéu!' }))
    expect(screen.queryByRole('region', { name: /^Encàrrec a la Botiga/ })).toBeNull()
  })

  it('a wish with no adapter is played with price tags; a wrong one only fades (no red cross)', async () => {
    const onSolved = renderShop({ skillId: 'C2' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    expect(screen.getByRole('region', { name: /^Encàrrec a la Botiga: / })).toHaveAttribute('data-errand-kind', 'fichas')
    const m = /^(\d+) ([+−]) (\d+) = \?$/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const answer = String(m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]))
    const tags = within(screen.getByRole('list', { name: 'Etiquetes de preu' }))
    const wrong = tags.getAllByRole('button').find((b) => b.getAttribute('aria-label') !== `Resposta ${answer}`)
    if (!wrong) throw new Error('Sense etiqueta errònia')
    await userEvent.click(wrong)
    await waitFor(() => expect(wrong).toHaveAttribute('aria-disabled', 'true'))
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    await userEvent.click(tags.getByRole('button', { name: `Resposta ${answer}` }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(1))
  })

  it('ignoring is fine: «Ara no» records nothing and the shop carries on', async () => {
    renderShop({ skillId: 'A4' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
    expect(screen.queryByTestId('errand-request')).toBeNull()
  })

  it('the HUD call (callSignal) opens the wish at once', async () => {
    const { rerender } = render(<BotigaPlace pending={1} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} forced={{ skillId: 'A4' }} />)
    rerender(<BotigaPlace pending={1} callSignal={1} onSolved={vi.fn()} onExit={vi.fn()} forced={{ skillId: 'A4' }} />)
    expect(await screen.findByTestId('errand-request')).toBeInTheDocument()
  })
})
