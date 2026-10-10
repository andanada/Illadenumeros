import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import { breakdown } from '../../../ui/visual/moneyLogic'
import MercatPlace from './MercatPlace'

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

const q = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel)
  if (!el) throw new Error(`Sense ${sel}`)
  return el
}
const loose = (def: string): HTMLElement => {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-def="${def}"]`)).filter((e) => !e.hasAttribute('data-in'))
  const el = all[all.length - 1]
  if (!el) throw new Error(`Sense ${def} solt`)
  return el
}
const request = (): string => screen.getByTestId('errand-request').textContent ?? ''
const cents = (euros: string, rest: string): number => Number(euros) * 100 + Number(rest.padEnd(2, '0'))

function renderMarket(opts: { skillId?: string; onSolved?: () => void } = {}) {
  const onSolved = opts.onSolved ?? vi.fn()
  render(<MercatPlace pending={1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} {...(opts.skillId ? { forced: { skillId: opts.skillId } } : {})} />)
  return onSolved
}

async function carryTo(def: string, zoneButton: string): Promise<void> {
  await userEvent.click(loose(def))
  await userEvent.click(screen.getByRole('button', { name: zoneButton }))
}

/** What the E10 sentence asks to pay: the new price, or the change of the shopper. */
function discountTarget(text: string): number {
  const m = /costa (\d+),(\d+) €.*?descompte del (\d+) ?%/.exec(text)
  if (!m || !m[1] || !m[2] || !m[3]) throw new Error(`Encàrrec inesperat: ${text}`)
  const price = cents(m[1], m[2])
  const now = (price * (100 - Number(m[3]))) / 100
  const paid = /paga amb (\d+),(\d+) €/.exec(text)
  return paid && paid[1] && paid[2] ? cents(paid[1], paid[2]) - now : now
}

/** E10 also asks «quant és el 25 % de 80?» (played on the sheet): open requests until the one paid with coins comes. */
async function openTrayRequest(): Promise<() => void> {
  for (let attempt = 0; attempt < 15; attempt++) {
    const onSolved = renderMarket({ skillId: 'E10' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per ajudar/ }))
    if (screen.getByRole('region', { name: /^Encàrrec a el Mercat: / }).getAttribute('data-errand-kind') === 'safata') return onSolved
    cleanup()
  }
  throw new Error('Cap encàrrec de monedes en 15 intents')
}

describe('Mercat: free play', () => {
  it('shows the square with stalls, stallholders, shoppers and a bubble waiting', async () => {
    renderMarket({ skillId: 'E10' })
    expect(screen.getByRole('region', { name: 'La plaça del mercat' })).toBeInTheDocument()
    for (const id of ['senyora-pilar', 'en-pau', 'l-avi-ramon', 'la-nuria', 'la-fatima']) expect(document.querySelector(`[data-actor="${id}"]`), id).not.toBeNull()
    expect(await screen.findByRole('button', { name: /toca per ajudar/ })).toHaveAttribute('data-anchor', 'waiting')
  })

  it('weighs an apple on the scale: it says how much it weighs', async () => {
    render(<MercatPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />)
    expect(screen.getByRole('status', { name: 'Bàscula: 0 kg' })).toBeInTheDocument()
    await userEvent.click(q('[data-uid="poma-1"]'))
    await userEvent.click(screen.getByRole('button', { name: 'Deixa-ho a la bàscula' }))
    expect(await screen.findByRole('status', { name: 'Bàscula: 0,15 kg' })).toBeInTheDocument()
  })

  it('arranges a stall: a flower goes to another place on the counter', async () => {
    render(<MercatPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />)
    await userEvent.click(q('[data-uid="flor-1"]'))
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Deixa/ }).length).toBeGreaterThan(1))
  })

  it('the exit takes the child out to the street', async () => {
    const onExit = vi.fn()
    render(<MercatPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={onExit} />)
    await userEvent.click(q('[data-door="porta-fora"]'))
    await waitFor(() => expect(onExit).toHaveBeenCalled())
  })
})

describe('Mercat: discounts with coins', () => {
  it('pays the new price on the cashier tray, records an attempt and gives coins', async () => {
    const onSolved = await openTrayRequest()
    const target = discountTarget(request())
    for (const piece of breakdown(target)) await carryTo(`peca-${piece}`, 'Deixa-ho a la safata de la caixa')
    await userEvent.click(screen.getByRole('button', { name: 'Cobra' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect(await db.attempts.toArray()).toHaveLength(1)
    expect(useProgress.getState().rewards.petals).toBe(3)
  })

  it('a wrong sum sends the coins back, no red cross, and a hint shows', async () => {
    await openTrayRequest()
    const target = discountTarget(request())
    const loosePieces = Array.from(document.querySelectorAll<HTMLElement>('[data-def^="peca-"]:not([data-in])')).map((e) => Number((e.getAttribute('data-def') ?? '').slice(5)))
    const wrong = loosePieces.find((c) => c !== target)
    if (wrong === undefined) throw new Error('Sense peça errònia')
    await carryTo(`peca-${wrong}`, 'Deixa-ho a la safata de la caixa')
    await userEvent.click(screen.getByRole('button', { name: 'Cobra' }))
    await waitFor(() => expect(q('[data-zone="safata"]')).toHaveAttribute('data-count', '0'))
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    expect(await screen.findByTestId('errand-hint')).toBeInTheDocument()
  })

  it('«Ara no» registers nothing', async () => {
    await openTrayRequest()
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
    expect(screen.queryByTestId('errand-request')).toBeNull()
  })
})

describe('Mercat: tenths with the scale', () => {
  it('puts bags of a tenth of a kilo on the big scale until it reads the weight, then answers how many', async () => {
    let onSolved: (() => void) | undefined
    for (let attempt = 0; attempt < 40 && !onSolved; attempt++) {
      const spy = renderMarket({ skillId: 'E1' })
      await userEvent.click(await screen.findByRole('button', { name: /toca per ajudar/ }))
      if (screen.getByRole('region', { name: /^Encàrrec a el Mercat: / }).getAttribute('data-errand-kind') === 'bascula') onSolved = spy
      else cleanup()
    }
    if (!onSolved) throw new Error('Cap encàrrec de bàscula en 40 intents')
    const m = /Vull (\d+),(\d) kg/.exec(request())
    if (!m || !m[1] || !m[2]) throw new Error(`Encàrrec inesperat: ${request()}`)
    const tenths = Number(m[1]) * 10 + Number(m[2])
    for (let i = 0; i < tenths; i++) await carryTo('bossa', 'Deixa-ho a la bàscula gran')
    expect(await screen.findByRole('status', { name: `Bàscula gran: ${m[1]},${m[2]} kg`.replace(',0 kg', ' kg') })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Comprova' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
  })
})

describe('Mercat: the rest of 5è on the market sheet', () => {
  it.each(['E2', 'E4', 'E6', 'E8', 'E9'])('%s is played with the price tags and nothing is crossed out', async (skillId) => {
    renderMarket({ skillId })
    await userEvent.click(await screen.findByRole('button', { name: /toca per ajudar/ }))
    const sheet = screen.getByRole('region', { name: /^Encàrrec a el Mercat: / })
    expect(sheet).toHaveAttribute('data-errand-kind', 'fichas')
    const tags = within(screen.getByRole('list', { name: 'Etiquetes de preu' }))
    const buttons = tags.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(1)
    await userEvent.click(buttons[0] as HTMLElement)
    expect(screen.queryByText(/✕|❌/)).toBeNull()
  })
})
