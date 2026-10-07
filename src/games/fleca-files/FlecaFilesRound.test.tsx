import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { CpaStage, Item } from '../../core/ambit/types'
import { makeTestFlow, makeTestRounds } from '../shared/testUtils'
import { FlecaFilesRound } from './FlecaFilesRound'

const makeItem = (a: number, b: number, cpaStage: CpaStage = 'concret'): Item => ({
  id: `m-${a}x${b}-${cpaStage}`,
  skillId: 'C3',
  text: `${a} × ${b} = ?`,
  speech: `${a} per ${b}`,
  answer: String(a * b),
  choices: [{ value: String(a * b) }, { value: String(a * b + 1) }, { value: String(a * b - 1) }],
  visual: { kind: 'none' },
  hintVisual: { kind: 'array', rows: a, cols: b },
  hints: ['Compta les files', 'Suma file a file', `${a} × ${b} = ${a * b}`],
  cpaStage,
  operands: { a, b, op: '×' },
})

const noop = (): void => undefined

describe('FlecaFilesRound', () => {
  it('requires filling the tray in the concrete stage, then answers', async () => {
    const item = makeItem(2, 3)
    const flow = makeTestFlow(item)
    render(<FlecaFilesRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)

    expect(screen.queryByRole('group', { name: 'Respostes' })).toBeNull()
    expect(screen.getByText('Fes 2 files de 3')).toBeInTheDocument()
    for (let i = 0; i < 6; i++) {
      await userEvent.click(screen.getAllByRole('button', { name: /^Magdalena/ })[0]!)
    }
    expect(screen.getByText('2 files de 3 = 6')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Resposta 6' }))
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
    expect(flow.answer.mock.calls[0]?.[0].value).toBe('6')
    expect(await screen.findByRole('button', { name: /Següent/ })).toBeInTheDocument()
  })

  it('shows a pre-filled tray in the pictorial stage', () => {
    render(<FlecaFilesRound flow={makeTestFlow(makeItem(3, 4, 'pictoric'))} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.queryAllByRole('button', { name: /^Magdalena/ })).toHaveLength(0)
    expect(screen.getByText('3 files de 4 = 12')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Respostes' })).toBeInTheDocument()
  })

  it('hides the tray in the abstract stage until requested, marking a hint', async () => {
    const flow = makeTestFlow(makeItem(3, 4, 'abstracte'))
    render(<FlecaFilesRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.queryByRole('img', { name: /Safata/ })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Mostra la safata' }))
    expect(flow.markHint).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('img', { name: /Safata de 3 files de 4/ })).toBeInTheDocument()
  })

  it('reveals partial products for a 2-digit multiplication', async () => {
    const item = makeItem(23, 4)
    render(<FlecaFilesRound flow={makeTestFlow(item)} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.queryByRole('group', { name: 'Respostes' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Calcula 20 × 4' }))
    await userEvent.click(screen.getByRole('button', { name: 'Calcula 3 × 4' }))
    expect(screen.getByRole('button', { name: '20 × 4 = 80' })).toBeInTheDocument()
    expect(await screen.findByRole('group', { name: 'Respostes' })).toBeInTheDocument()
  })
})
