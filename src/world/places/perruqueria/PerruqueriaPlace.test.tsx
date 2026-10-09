import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import PerruqueriaPlace from './PerruqueriaPlace'

// Many taps per test: a loaded machine (the whole suite in parallel) needs more than the default 5 s.
vi.setConfig({ testTimeout: 30_000 })

let db: MatesDb

beforeEach(() => {
  db = activateTestPlayer()
})

const request = (): string => screen.getByTestId('errand-request').textContent ?? ''

function renderSalon(skillId: string, onSolved = vi.fn(), pending = 1) {
  render(<PerruqueriaPlace pending={pending} callSignal={0} onSolved={onSolved} onExit={vi.fn()} forced={{ skillId }} />)
  return onSolved
}

const clipBox = (stage: HTMLElement): HTMLElement => {
  const el = stage.querySelector<HTMLElement>('[data-prop-kind="pinca-caixa"]')
  if (!el) throw new Error('Sense capsa')
  return el
}

async function fillTray(stage: HTMLElement, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await userEvent.click(clipBox(stage))
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a la safata' }))
  }
}

describe('PerruqueriaPlace errands', () => {
  it('two groups of clips, solved by tap-to-place: attempt recorded, coins, cheer', async () => {
    const onSolved = renderSalon('A7')
    const stage = screen.getByRole('region', { name: /^Encàrrec a la Perruqueria/ })
    expect(stage).toHaveAttribute('data-errand-kind', 'pinces')
    const m = /: (\d+) \+ (\d+)\./.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const total = Number(m[1]) + Number(m[2])
    await fillTray(stage, total)
    expect(screen.getByRole('img', { name: new RegExp(`^Safata: ${total} pinc`) })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    const attempts = await db.attempts.toArray()
    expect(attempts).toHaveLength(1)
    expect(attempts[0]).toMatchObject({ gameId: 'poble-perruqueria', skillId: 'A7', correct: true, hintsUsed: 0 })
    expect(useProgress.getState().rewards.petals).toBe(3)
    expect(screen.getByTestId('errand-request')).toHaveTextContent(/Moltes gràcies!.*3 monedes/)
    expect(screen.getByTestId('errand-neighbour')).toHaveAttribute('data-pose', 'cheer')
    // The next customer starts with an empty tray.
    await userEvent.click(screen.getByRole('button', { name: 'Adéu!' }))
    expect(await screen.findByRole('img', { name: /^Safata: 0 / })).toBeInTheDocument()
  })

  it('"how many more" errands: she only brings what is missing', async () => {
    const onSolved = renderSalon('A5')
    const stage = screen.getByRole('region', { name: /^Encàrrec a la Perruqueria/ })
    const m = /Ja porto (\d+) pinc\S+ i en vull (\d+)/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    await fillTray(stage, Number(m[2]) - Number(m[1]))
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
  })

  it('a wrong tray never shows a cross: hint, then the right one counts as helped', async () => {
    const onSolved = renderSalon('A4')
    const stage = screen.getByRole('region', { name: /^Encàrrec a la Perruqueria/ })
    await fillTray(stage, 1)
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    expect((await screen.findByTestId('errand-hint')).textContent?.length).toBeGreaterThan(0)
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    const m = /: (\d+) \+ (\d+)\./.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    await fillTray(stage, Number(m[1]) + Number(m[2]) - 1)
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(1))
    const attempts = await db.attempts.toArray()
    expect(attempts.map((a) => a.correct).sort()).toEqual([false, true])
    expect(attempts.find((a) => a.correct)?.hintsUsed).toBeGreaterThan(0)
  })

  it('a clip can be taken back off the tray', async () => {
    renderSalon('A4')
    const stage = screen.getByRole('region', { name: /^Encàrrec a la Perruqueria/ })
    await fillTray(stage, 2)
    await userEvent.click(screen.getByRole('button', { name: 'Treu una pinça de la safata' }))
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a la capsa de pinces' }))
    expect(screen.getByRole('img', { name: /^Safata: 1 pinça/ })).toBeInTheDocument()
  })

  it('the customer stands behind the desk by name and the rest queue at the door', async () => {
    renderSalon('A4', vi.fn(), 3)
    const stage = screen.getByRole('region', { name: 'Encàrrec a la Perruqueria: Senyora Pilar' })
    expect(within(stage).getByRole('img', { name: 'Senyora Pilar' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '2 clients esperen a la porta' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(screen.getByRole('img', { name: '3 clients esperen a la porta' })).toBeInTheDocument()
  })

  it('"Ajuda" has the customer say the hint and draw the model', async () => {
    renderSalon('A8')
    await userEvent.click(screen.getByRole('button', { name: 'Ajuda' }))
    expect((await screen.findByTestId('errand-hint')).textContent?.length).toBeGreaterThan(0)
    expect(screen.getByRole('group', { name: 'Pista' })).toBeInTheDocument()
  })
})

describe('PerruqueriaPlace free play', () => {
  it('with nobody asking, tools restyle the customer and she reacts; the bell calls the next one', async () => {
    render(<PerruqueriaPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />)
    const before = screen.getByRole('img', { name: 'La Fàtima, a la cadira' }).innerHTML
    await userEvent.click(screen.getByRole('button', { name: 'les tisores' }))
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a la clienta' }))
    expect(screen.getByRole('img', { name: 'La Fàtima, a la cadira' }).innerHTML).not.toBe(before)
    expect(screen.getByText(/Cris, cris|Tallat/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'l’assecador' }))
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a la clienta' }))
    expect(screen.getByTestId('aire')).toBeInTheDocument()
    expect(await db.attempts.count()).toBe(0)
    expect(useProgress.getState().rewards.petals).toBe(0)
    await userEvent.click(screen.getByRole('button', { name: 'Fes passar un client' }))
    expect(screen.getByRole('region', { name: /^Encàrrec a la Perruqueria: / })).toBeInTheDocument()
  })
})
