import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import { Scene } from '../../../scene/Scene'
import { PayTask } from './PayTask'
import { payFromItem } from './payLogic'

const item: Item = {
  id: 'canvi',
  skillId: 'C9',
  text: 'La Rita compra un pa que costa 3,50 € i paga amb 5,00 €. Quant canvi li tornen?',
  speech: '',
  answer: '1,50 €',
  choices: [{ value: '1,50 €' }, { value: '2,50 €', misconception: 'no-carry' }, { value: '1,05 €' }],
  visual: { kind: 'none' },
  hintVisual: { kind: 'none' },
  hints: ['a', 'b', 'c'],
  cpaStage: 'pictoric',
  operands: { a: 500, b: 350, op: '-' },
}

function setup(props: { solution?: boolean; hintLevel?: 0 | 1 } = {}) {
  const task = payFromItem(item)
  if (!task) throw new Error('sense tasca')
  const submit = vi.fn()
  render(
    <Scene label="Prova">
      <PayTask task={task} item={item} hintLevel={props.hintLevel ?? 0} wrongValues={[]} locked={false} solution={props.solution ?? false} tries={0} submit={submit} />
    </Scene>,
  )
  return submit
}

const drawer = () => within(screen.getByRole('list', { name: 'Calaix de la caixa' }))

describe('PayTask', () => {
  it('hands over the exact change by tapping coins onto the tray', async () => {
    const submit = setup()
    expect(screen.getByRole('button', { name: 'Dona el canvi' })).toBeDisabled()
    await userEvent.click(drawer().getAllByRole('button', { name: 'la moneda de 1 €' })[0] as HTMLElement)
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a la safata del taulell' }))
    await userEvent.click(drawer().getAllByRole('button', { name: 'la moneda de 50 cts' })[0] as HTMLElement)
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a la safata del taulell' }))
    expect(screen.getByLabelText('Safata: 1,50 €')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Dona el canvi' }))
    expect(submit).toHaveBeenCalledWith({ value: '1,50 €' })
  })

  it('a coin on the tray can go back to the drawer; a wrong total keeps its misconception', async () => {
    const submit = setup({ hintLevel: 1 })
    await userEvent.click(drawer().getAllByRole('button', { name: 'la moneda de 2 €' })[0] as HTMLElement)
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a la safata del taulell' }))
    expect(screen.getByText('Hi ha 2 €')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Dona el canvi' }))
    expect(submit.mock.calls[0]?.[0].value).not.toBe('1,50 €')
    const tray = screen.getByLabelText('Safata: 2 €')
    await userEvent.click(within(tray).getByRole('button', { name: 'la moneda de 2 €' }))
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho al calaix de la caixa' }))
    expect(screen.getByLabelText('Safata: 0 €')).toBeInTheDocument()
  })

  it('shows the solution coins when the answer is revealed', () => {
    setup({ solution: true })
    expect(screen.getByLabelText('Safata: 1,50 €')).toBeInTheDocument()
  })
})
