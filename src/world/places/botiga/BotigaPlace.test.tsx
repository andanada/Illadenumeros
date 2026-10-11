import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import { breakdown, parseEuros } from '../../../ui/visual/moneyLogic'
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

function renderShop(opts: { pending?: number; skillId?: string; factKey?: string; onSolved?: () => void } = {}) {
  const onSolved = opts.onSolved ?? vi.fn()
  render(<BotigaPlace pending={opts.pending ?? 1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} {...(opts.skillId ? { forced: { skillId: opts.skillId, ...(opts.factKey ? { factKey: opts.factKey } : {}) } } : {})} />)
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

/** Carries one loose thing into a zone with tap-select + tap-target, and waits until her hands are free again. */
async function carryTo(def: string, zoneButton: string): Promise<void> {
  const loose = Array.from(document.querySelectorAll<HTMLElement>(`[data-def="${def}"]`)).filter((e) => !e.hasAttribute('data-in'))
  const piece = loose.at(-1)
  if (!piece) throw new Error(`Sense ${def} solt`)
  await userEvent.click(piece)
  await userEvent.click(screen.getByRole('button', { name: zoneButton }))
  await waitFor(() => expect(avatar()).not.toHaveAccessibleName(/porta/))
}

const zone = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-zone="${id}"]`)
  if (!el) throw new Error(`Sense zona ${id}`)
  return el
}

/** The def of the goods a basket request spilled on the floor. */
const spilled = (): string => document.querySelector<HTMLElement>('[data-def$="-peticio"]')?.getAttribute('data-def') ?? ''

async function openWish(skillId: string, factKey?: string): Promise<() => void> {
  const onSolved = renderShop({ skillId, ...(factKey ? { factKey } : {}) })
  await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
  return onSolved
}

describe('Botiga: baskets in the world', () => {
  it('sum: the crate spills onto the floor, she carries the goods into the basket and hands it over', async () => {
    const onSolved = await openWish('A4', 'add:5+7')
    expect(screen.getByRole('region', { name: /^Encàrrec a la Botiga: / })).toHaveAttribute('data-errand-kind', 'cistella')
    const m = /Vull (\d+) \+ (\d+) (\S+)!/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const total = Number(m[1]) + Number(m[2])
    const def = spilled()
    expect(def).not.toBe('')
    expect(zone('cistella')).toHaveAttribute('data-count', '0')
    expect(screen.getByRole('button', { name: 'Dona la cistella' })).toBeDisabled()
    // The pile has the right number and a couple more (so she counts, not just empties the crate).
    expect(document.querySelectorAll(`[data-def="${def}"]:not([data-in])`)).toHaveLength(total + 2)
    for (let i = 0; i < total; i++) await carryTo(def, 'Deixa-ho a la cistella')
    expect(zone('cistella')).toHaveAttribute('data-count', String(total))
    await userEvent.click(screen.getByRole('button', { name: 'Dona la cistella' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect(await db.attempts.toArray()).toHaveLength(1)
    expect((await db.attempts.toArray())[0]).toMatchObject({ gameId: 'poble-botiga', correct: true, hintsUsed: 0 })
    expect(useProgress.getState().rewards.petals).toBe(3)
    expect(screen.getByTestId('errand-request')).toHaveTextContent(/Moltes gràcies!.*3 monedes/)
    // The basket was handed over: it is empty again and the customer got it.
    await waitFor(() => expect(zone('cistella')).toHaveAttribute('data-count', '0'))
    await userEvent.click(screen.getByRole('button', { name: 'Adéu!' }))
    expect(screen.queryByTestId('errand-request')).toBeNull()
    expect(document.querySelector('[data-zone="cistella"]')).toBeNull()
    expect(document.querySelector('[data-def$="-peticio"]')).toBeNull()
  })

  it('missing addend: the basket already holds some, she adds the rest', async () => {
    const onSolved = await openWish('A5', 'c10:4')
    const m = /Tinc (\d+) .*en vull (\d+)/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const [have, want] = [Number(m[1]), Number(m[2])]
    await waitFor(() => expect(zone('cistella')).toHaveAttribute('data-count', String(have)))
    expect(screen.getByRole('button', { name: 'Dona la cistella' })).toBeDisabled()
    const def = spilled()
    for (let i = 0; i < want - have; i++) await carryTo(def, 'Deixa-ho a la cistella')
    await userEvent.click(screen.getByRole('button', { name: 'Dona la cistella' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect((await db.attempts.toArray())[0]).toMatchObject({ correct: true })
  })

  it('take away: she takes the extra ones OUT of the basket into the box', async () => {
    const onSolved = await openWish('A6', 'sub:7-2')
    const m = /^(\d+) − (\d+): tinc/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const [a, b] = [Number(m[1]), Number(m[2])]
    await waitFor(() => expect(zone('cistella')).toHaveAttribute('data-count', String(a)))
    expect(screen.getByRole('button', { name: 'Dona la cistella' })).toBeDisabled()
    for (let i = 0; i < b; i++) {
      await userEvent.click(document.querySelector<HTMLElement>('[data-in="cistella"]') as HTMLElement)
      await waitFor(() => expect(avatar()).toHaveAccessibleName(/porta/))
      await userEvent.click(screen.getByRole('button', { name: 'Deixa-ho a la caixa de les que sobren' }))
      await waitFor(() => expect(avatar()).not.toHaveAccessibleName(/porta/))
    }
    expect(zone('cistella')).toHaveAttribute('data-count', String(a - b))
    expect(zone('sobrants')).toHaveAttribute('data-count', String(b))
    await userEvent.click(screen.getByRole('button', { name: 'Dona la cistella' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
  })

  it('a wrong basket pops everything back, a hint shows and nothing turns red', async () => {
    await openWish('A4', 'add:5+7')
    await carryTo(spilled(), 'Deixa-ho a la cistella')
    await userEvent.click(screen.getByRole('button', { name: 'Dona la cistella' }))
    await waitFor(() => expect(zone('cistella')).toHaveAttribute('data-count', '0'))
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    expect(await screen.findByTestId('errand-hint')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dona la cistella' })).toBeDisabled()
  })

  it('a wrong take-away puts what she took out back into the basket', async () => {
    await openWish('A6', 'sub:7-2')
    const a = Number(/^(\d+) − /.exec(request())?.[1])
    await userEvent.click(document.querySelector<HTMLElement>('[data-in="cistella"]') as HTMLElement)
    await userEvent.click(screen.getByRole('button', { name: 'Deixa-ho a la caixa de les que sobren' }))
    await waitFor(() => expect(zone('sobrants')).toHaveAttribute('data-count', '1'))
    await userEvent.click(screen.getByRole('button', { name: 'Dona la cistella' }))
    await waitFor(() => expect(zone('cistella')).toHaveAttribute('data-count', String(a)))
    expect(zone('sobrants')).toHaveAttribute('data-count', '0')
    expect(await screen.findByTestId('errand-hint')).toBeInTheDocument()
  })

  it('asking for help runs the ladder and the answer then counts as helped', async () => {
    const onSolved = await openWish('A4', 'add:5+7')
    await userEvent.click(screen.getByRole('button', { name: 'Ajuda' }))
    expect(await screen.findByTestId('errand-hint')).toBeInTheDocument()
    const m = /Vull (\d+) \+ (\d+)/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const def = spilled()
    for (let i = 0; i < Number(m[1]) + Number(m[2]); i++) await carryTo(def, 'Deixa-ho a la cistella')
    await userEvent.click(screen.getByRole('button', { name: 'Dona la cistella' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalled())
    expect((await db.attempts.toArray())[0]?.hintsUsed).toBeGreaterThan(0)
  })

  it('«Ara no» registers nothing and tidies the floor', async () => {
    await openWish('A4', 'add:5+7')
    expect(spilled()).not.toBe('')
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
    expect(screen.queryByTestId('errand-request')).toBeNull()
    expect(spilled()).toBe('')
  })

  it('works with the keyboard: focus the thing, Enter picks it up, Enter on the basket puts it in', async () => {
    await openWish('A4', 'add:5+7')
    const piece = Array.from(document.querySelectorAll<HTMLElement>(`[data-def="${spilled()}"]`)).at(-1) as HTMLElement
    piece.focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(avatar()).toHaveAccessibleName(/porta/))
    screen.getByRole('button', { name: 'Deixa-ho a la cistella' }).focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(zone('cistella')).toHaveAttribute('data-count', '1'))
  })
})

/** Opens change wishes (C9 mixes them with other money questions) until one asks for change. */
async function openChangeWish(): Promise<() => void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    const onSolved = renderShop({ skillId: 'C9' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    if (document.querySelector('[data-zone="ma-client"]')) return onSolved
    cleanup()
  }
  throw new Error('Cap encàrrec de canvi en 60 intents')
}

const changeTarget = (): number => {
  const m = /costa (.+?) i et pago amb (.+?)\./.exec(request())
  if (!m?.[1] || !m[2]) throw new Error(`Encàrrec inesperat: ${request()}`)
  return (parseEuros(m[2]) ?? 0) - (parseEuros(m[1]) ?? 0)
}

describe('Botiga: change from the till drawer', () => {
  it('takes the coins from the drawer into the customer’s hand and hands the change over', async () => {
    const onSolved = await openChangeWish()
    expect(screen.getByRole('button', { name: 'Dona el canvi' })).toBeDisabled()
    for (const piece of breakdown(changeTarget())) await carryTo(`peca-${piece}`, 'Deixa-ho a la mà del client')
    await userEvent.click(screen.getByRole('button', { name: 'Dona el canvi' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect((await db.attempts.toArray())[0]).toMatchObject({ gameId: 'poble-botiga', correct: true })
    await waitFor(() => expect(zone('ma-client')).toHaveAttribute('data-count', '0'))
  })

  it('a wrong amount sends the coins back to the drawer, with a hint and no red cross', async () => {
    await openChangeWish()
    const target = changeTarget()
    // One piece that is surely not the whole change.
    const wrong = Array.from(document.querySelectorAll<HTMLElement>('[data-def^="peca-"]')).map((e) => e.getAttribute('data-def') ?? '').find((d) => Number(d.slice(5)) !== target)
    if (!wrong) throw new Error('Sense peça errònia')
    await carryTo(wrong, 'Deixa-ho a la mà del client')
    await userEvent.click(screen.getByRole('button', { name: 'Dona el canvi' }))
    await waitFor(() => expect(zone('ma-client')).toHaveAttribute('data-count', '0'))
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    expect(await screen.findByTestId('errand-hint')).toBeInTheDocument()
  })
})

describe('Botiga: wishes of the customers', () => {
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
    renderShop({ skillId: 'C2' })
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
