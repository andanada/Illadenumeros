import type { Item } from '../../core/ambit/types'
import { addPiece, planFromItem, removePiece, solutionPieces, verdict, wrongValueFor } from './shopLogic'

const base: Item = {
  id: 'x',
  skillId: 'C9',
  text: 'Costa 3,50 €. Paga amb 5 €. Dóna el canvi.',
  speech: '',
  answer: '1,50 €',
  choices: [{ value: '1,50 €' }, { value: '2 €' }],
  visual: { kind: 'money', coins: [500] },
  hintVisual: { kind: 'none' },
  hints: ['', '', ''],
  cpaStage: 'concret',
}

describe('shopLogic', () => {
  it('plays pay mode only for concrete change questions with an amount answer', () => {
    expect(planFromItem(base)).toEqual({ mode: 'pay', target: 150 })
    expect(planFromItem({ ...base, text: 'Quant és el canvi?' })).toEqual({ mode: 'pay', target: 150 })
    expect(planFromItem({ ...base, cpaStage: 'pictoric' })).toEqual({ mode: 'choices' })
    expect(planFromItem({ ...base, text: 'Quants diners són 1 € i 50 cts?' })).toEqual({ mode: 'choices' })
    expect(planFromItem({ ...base, answer: '3' })).toEqual({ mode: 'choices' })
  })
  it('adds and removes pieces immutably', () => {
    const a: readonly number[] = [100]
    const b = addPiece(a, 50)
    expect(b).toEqual([100, 50])
    expect(a).toEqual([100])
    expect(removePiece(b, 0)).toEqual([50])
  })
  it('gives kind verdicts', () => {
    expect(verdict([], 150).message).toContain('Arrossega')
    expect(verdict([100], 150)).toMatchObject({ status: 'short', total: 100 })
    expect(verdict([100, 50], 150)).toMatchObject({ status: 'exact', total: 150 })
    expect(verdict([200], 150).message).toContain('massa')
    expect(verdict([100, 50], 150).message).toContain('1,50 €')
  })
  it('builds the solution and a wrong value distinct from the answer', () => {
    expect(solutionPieces(150)).toEqual([100, 50])
    expect(wrongValueFor(200, '1,50 €')).toBe('2 €')
    expect(wrongValueFor(150, '1,50 €')).not.toBe('1,50 €')
    expect(wrongValueFor(200, '1,50 €', [{ value: '2,00 €' }])).toBe('2,00 €')
  })
})
