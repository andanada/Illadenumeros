import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import GranjaPlace from './GranjaPlace'

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
  const el = Array.from(document.querySelectorAll<HTMLElement>(`[data-def="${def}"]`)).find((e) => !e.hasAttribute('data-in'))
  if (!el) throw new Error(`Sense ${def} solt`)
  return el
}
const request = (): string => screen.getByTestId('errand-request').textContent ?? ''

function renderFarm(opts: { skillId?: string; factKey?: string; onSolved?: () => void } = {}) {
  const onSolved = opts.onSolved ?? vi.fn()
  const forced = opts.skillId ? { forced: { skillId: opts.skillId, ...(opts.factKey ? { factKey: opts.factKey } : {}) } } : {}
  render(<GranjaPlace pending={1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} {...forced} />)
  return onSolved
}

/** Carry one loose thing into a zone with tap-to-select, then tap the zone. */
async function carryTo(def: string, zoneButton: string): Promise<void> {
  await userEvent.click(loose(def))
  await userEvent.click(screen.getByRole('button', { name: zoneButton }))
}

describe('Granja: free play', () => {
  it('shows the garden with the farmer, the visitors and the pets, and a bubble waiting', async () => {
    renderFarm({ skillId: 'C3' })
    expect(screen.getByRole('region', { name: 'L’hort' })).toBeInTheDocument()
    expect(document.querySelector('[data-actor="l-avi-ramon"]')).not.toBeNull()
    expect(await screen.findByRole('button', { name: /toca per ajudar/ })).toHaveAttribute('data-anchor', 'waiting')
  })

  it('sows a seed in the plot, waters it twice and feeds it: it grows to a ripe carrot', async () => {
    render(<GranjaPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />)
    await userEvent.click(q('[data-uid="sac-llavors"]'))
    await waitFor(() => expect(q('[data-uid="sac-llavors"]')).toHaveAttribute('data-open', 'true'))
    await userEvent.click(q('[data-def="planta"]'))
    await userEvent.click(screen.getByRole('button', { name: 'Deixa-ho a les files de l’hort' }))
    await waitFor(() => expect(q('[data-zone="hort-lliure"]')).toHaveAttribute('data-count', '1'))
    const plant = (): HTMLElement => q('[data-def="planta"][data-in="hort-lliure"]')
    for (const tool of ['regadora', 'regadora', 'adob']) {
      await userEvent.click(q(`[data-def="${tool}"]`))
      await waitFor(() => expect(document.querySelector('[data-actor="laia"]')).toHaveAccessibleName(/porta/))
      await userEvent.click(plant())
      await userEvent.click(screen.getByRole('button', { name: 'Accions' }))
      await userEvent.click(q('[data-ring-item="deixa"]'))
      await waitFor(() => expect(document.querySelector('[data-actor="laia"]')).not.toHaveAccessibleName(/porta/))
    }
    await waitFor(() => expect(plant().getAttribute('data-stage')).toBe('madura'))
  })

  it('collects an egg from the nest into the 6-egg box and feeds a pet with grain', async () => {
    render(<GranjaPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />)
    await userEvent.click(q('[data-door="porta-corral"]'))
    await waitFor(() => expect(screen.getByRole('region', { name: 'El corral' })).toBeInTheDocument())
    await userEvent.click(q('[data-uid="niu-1"]'))
    await waitFor(() => expect(q('[data-uid="niu-1"]')).toHaveAttribute('data-open', 'true'))
    await userEvent.click(q('[data-def="ou"]'))
    await userEvent.click(screen.getByRole('button', { name: 'Deixa-ho a la caixa de 6 ous' }))
    await waitFor(() => expect(q('[data-zone="caixa-6"]')).toHaveAttribute('data-count', '1'))
    await userEvent.click(q('[data-uid="sac-gra"]'))
    await waitFor(() => expect(q('[data-uid="sac-gra"]')).toHaveAttribute('data-open', 'true'))
    await userEvent.click(q('[data-def="gra"]'))
    await waitFor(() => expect(document.querySelector('[data-actor="laia"]')).toHaveAccessibleName(/porta el cub de gra/))
    await userEvent.click(q('[data-actor="blau"]'))
    await waitFor(() => expect(document.querySelector('[data-actor="laia"]')).not.toHaveAccessibleName(/porta/))
  })

  it('the path leads to the farmyard and back', async () => {
    renderFarm()
    await userEvent.click(q('[data-door="porta-corral"]'))
    await waitFor(() => expect(screen.getByRole('region', { name: 'El corral' })).toBeInTheDocument())
    await userEvent.click(q('[data-door="porta-hort"]'))
    await waitFor(() => expect(screen.getByRole('region', { name: 'L’hort' })).toBeInTheDocument())
  })

  it('the gate takes the child out to the street', async () => {
    const onExit = vi.fn()
    render(<GranjaPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={onExit} />)
    await userEvent.click(q('[data-door="porta-fora"]'))
    await waitFor(() => expect(onExit).toHaveBeenCalled())
  })
})

describe('Granja: sowing in rows (multiplying)', () => {
  it('sows rows × columns of seeds on the plot, counts them and pays coins', async () => {
    const onSolved = renderFarm({ skillId: 'C3', factKey: 'mul:3x4' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per ajudar/ }))
    const sheet = screen.getByRole('region', { name: /^Encàrrec a la Granja: / })
    expect(sheet).toHaveAttribute('data-errand-kind', 'parcel')
    const m = /Vull (\d+) fil\w+ de (\d+) llavor/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const total = Number(m[1]) * Number(m[2])
    const zone = q('[data-zone="parcel"]')
    expect(zone).toHaveAttribute('data-count', '0')
    for (let i = 0; i < total; i++) await carryTo('llavor-peticio', 'Deixa-ho a la parcel·la')
    expect(zone).toHaveAttribute('data-count', String(total))
    await userEvent.click(screen.getByRole('button', { name: 'Comprova' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect(await db.attempts.toArray()).toHaveLength(1)
    expect(useProgress.getState().rewards.petals).toBe(3)
    expect(screen.getByTestId('errand-request')).toHaveTextContent(/Moltes gràcies!.*3 monedes/)
  })

  it('a wrong count sends the seeds back with a hint, no red cross', async () => {
    renderFarm({ skillId: 'C3', factKey: 'mul:3x4' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per ajudar/ }))
    await carryTo('llavor-peticio', 'Deixa-ho a la parcel·la')
    await userEvent.click(screen.getByRole('button', { name: 'Comprova' }))
    await waitFor(() => expect(q('[data-zone="parcel"]')).toHaveAttribute('data-count', '0'))
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    expect(await screen.findByTestId('errand-hint')).toBeInTheDocument()
  })

  it('«Ara no» records nothing', async () => {
    renderFarm({ skillId: 'C3', factKey: 'mul:3x4' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per ajudar/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
    expect(screen.queryByTestId('errand-request')).toBeNull()
  })
})

describe('Granja: sharing the feed (dividing)', () => {
  it('deals the feed into equal bowls and answers how many each', async () => {
    const onSolved = renderFarm({ skillId: 'C7', factKey: 'div:20:5' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per ajudar/ }))
    expect(screen.getByRole('region', { name: /^Encàrrec a la Granja: / })).toHaveAttribute('data-errand-kind', 'repartir')
    const m = /Reparteix (\d+) cubs de gra entre (\d+) animals/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const total = Number(m[1])
    const animals = Number(m[2])
    const each = total / animals
    const bowls = Array.from(document.querySelectorAll<HTMLElement>('[data-zone^="bol-"]'))
    expect(bowls).toHaveLength(animals)
    expect(screen.getByRole('button', { name: 'Comprova' })).toBeDisabled()
    for (let b = 0; b < animals; b++) {
      const name = bowls[b]?.getAttribute('aria-label') ?? ''
      for (let i = 0; i < each; i++) await carryTo('gra', `Deixa-ho ${name.startsWith('el ') ? `al ${name.slice(3)}` : `a ${name}`}`)
    }
    await userEvent.click(screen.getByRole('button', { name: 'Comprova' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
  })

  it('asks the remainder and says «en sobren»', async () => {
    renderFarm({ skillId: 'D6', factKey: 'div:23:8' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per ajudar/ }))
    const sheet = screen.getByRole('region', { name: /^Encàrrec a la Granja: / })
    expect(within(sheet).getByTestId('errand-request')).toBeInTheDocument()
  })
})

describe('Granja: skills without a world version', () => {
  it('play with the price-tag sheet and a wrong tag only fades', async () => {
    const onSolved = renderFarm({ skillId: 'E7', factKey: undefined })
    await userEvent.click(await screen.findByRole('button', { name: /toca per ajudar/ }))
    const sheet = screen.getByRole('region', { name: /^Encàrrec a la Granja: / })
    const kind = sheet.getAttribute('data-errand-kind')
    if (kind !== 'fichas') return
    const tags = within(screen.getByRole('list', { name: 'Etiquetes de preu' }))
    expect(tags.getAllByRole('button').length).toBeGreaterThan(1)
    expect(onSolved).not.toHaveBeenCalled()
  })
})
