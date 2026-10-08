import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import BotigaPlace from './BotigaPlace'

let db: MatesDb

beforeEach(() => {
  db = activateTestPlayer()
})

const request = (): string => screen.getByTestId('errand-request').textContent ?? ''

function renderShop(skillId: string, onSolved = vi.fn()) {
  render(<BotigaPlace pending={1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} forced={{ skillId }} />)
  return onSolved
}

describe('BotigaPlace errands', () => {
  it('a basket errand solved by tap-to-place records an attempt and gives coins', async () => {
    const onSolved = renderShop('A4')
    const stage = screen.getByRole('region', { name: /^Encàrrec a / })
    expect(stage).toHaveAttribute('data-errand-kind', 'cistella')
    const m = /Vull (\d+) \+ (\d+)/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const total = Number(m[1]) + Number(m[2])
    for (let i = 0; i < total; i++) {
      await userEvent.click(within(stage).getByRole('button', { name: /^la |^el / }))
      await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a la cistella' }))
    }
    expect(screen.getByRole('img', { name: new RegExp(`^Cistella: ${total} `) })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))

    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    const attempts = await db.attempts.toArray()
    expect(attempts).toHaveLength(1)
    expect(attempts[0]).toMatchObject({ gameId: 'poble-botiga', skillId: 'A4', correct: true, hintsUsed: 0 })
    expect(useProgress.getState().rewards.petals).toBe(3)
    expect(screen.getByTestId('errand-request')).toHaveTextContent(/Moltes gràcies!.*3 monedes/)

    // Regression: the next neighbour gets an empty basket, not the previous one's.
    await userEvent.click(screen.getByRole('button', { name: 'Adéu!' }))
    expect(await screen.findByRole('img', { name: /^Cistella: 0 / })).toBeInTheDocument()
  })

  it('a fallback errand: a wrong tag bounces gently, the right one counts as helped', async () => {
    const onSolved = renderShop('C2')
    expect(screen.getByRole('region', { name: /^Encàrrec a / })).toHaveAttribute('data-errand-kind', 'fichas')
    const m = /^(\d+) ([+−]) (\d+) = \?$/.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const answer = String(m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]))
    const tags = within(screen.getByRole('list', { name: 'Etiquetes de preu' }))
    const wrong = tags.getAllByRole('button').find((b) => b.getAttribute('aria-label') !== `Resposta ${answer}`)
    if (!wrong) throw new Error('Sense etiqueta errònia')
    await userEvent.click(wrong)
    await waitFor(() => expect(wrong).toHaveAttribute('aria-disabled', 'true'))
    expect(screen.queryByText(/✕|❌/)).toBeNull()
    expect((await screen.findByTestId('errand-hint')).textContent?.length).toBeGreaterThan(0)
    expect(wrong).toHaveAttribute('aria-disabled', 'true')

    await userEvent.click(tags.getByRole('button', { name: `Resposta ${answer}` }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(1))
    const attempts = await db.attempts.toArray()
    expect(attempts.map((a) => a.correct).sort()).toEqual([false, true])
    expect(attempts.every((a) => a.gameId === 'poble-botiga')).toBe(true)
    expect(attempts.find((a) => a.correct)?.hintsUsed).toBeGreaterThan(0)

    // The board still has errands: the next neighbour comes straight in.
    await userEvent.click(screen.getByRole('button', { name: 'Adéu!' }))
    expect(await screen.findByRole('button', { name: 'Ara no' })).toBeInTheDocument()
  })

  it('"Ara no" sends the neighbour away without recording; the bell calls the next one', async () => {
    renderShop('A4')
    await userEvent.click(screen.getByRole('button', { name: 'Ajuda' }))
    expect(screen.getByText(/compta|Comença|punts/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
    await userEvent.click(screen.getByRole('button', { name: 'Fes passar un veí' }))
    expect(screen.getByRole('region', { name: /^Encàrrec a / })).toBeInTheDocument()
  })

  it('free play: restock a shelf, ring it up, open the fridge, wake the cat', async () => {
    renderShop('A4')
    await userEvent.click(within(screen.getByRole('list', { name: 'Caixa del repartidor' })).getByRole('button', { name: 'el plàtan' }))
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho al prestatge de baix' }))
    const bottom = screen.getByRole('list', { name: 'el prestatge de baix' })
    expect(within(bottom).getAllByRole('button')).toHaveLength(1)

    await userEvent.click(within(bottom).getByRole('button'))
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a la caixa registradora' }))
    expect(screen.getByRole('button', { name: /caixa registradora, marca 0,40 €/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /caixa registradora, marca/ }))
    expect(screen.getByRole('button', { name: /caixa registradora, marca 0 €/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'La nevera, tancada' }))
    expect(screen.getByRole('button', { name: 'La nevera, oberta' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /gata Mixa, dormint/ }))
    expect(screen.getByRole('button', { name: /gata Mixa, desperta/ })).toBeInTheDocument()
  })
})
