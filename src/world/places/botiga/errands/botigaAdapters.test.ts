import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { matesAmbit } from '../../../../ambits/mates'
import { CPA_STAGES, type Item } from '../../../../core/ambit/types'
import { createRng } from '../../../../core/rng'
import { breakdown, parseEuros, sumCents } from '../../../../ui/visual/moneyLogic'
import { choiceForValue, pickAdapter } from '../../../errands/adapters'
import { BOTIGA_SKILLS } from '../botigaSkills'
import { addOne, BASKET_MAX, basketFromItem, basketRequest, basketValue, solutionCount, takeOne } from './basketLogic'
import { BOTIGA_ADAPTERS, basketAdapter, payAdapter } from './botigaAdapters'
import { drawerPieces, movePiece, payChoice, payFromItem, payRequest, trayTotal } from './payLogic'

const item = (skillId: string, seed: string, stage: (typeof CPA_STAGES)[number] = 'concret'): Item => {
  const gen = matesAmbit.generators[skillId]
  if (!gen) throw new Error(skillId)
  return gen({ rng: createRng(seed), cpaStage: stage })
}

const base: Item = { id: 'x', skillId: 'A4', text: '7 + 5 = ?', speech: '', answer: '12', choices: [{ value: '12' }, { value: '11', misconception: 'off-by-one' }, { value: '13' }], visual: { kind: 'none' }, hintVisual: { kind: 'none' }, hints: ['a', 'b', 'c'], cpaStage: 'concret', operands: { a: 7, b: 5, op: '+' } }

describe('botiga skills', () => {
  it('serves the addition, subtraction and money skills of the old games', () => {
    for (const id of ['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'B4', 'B5', 'B6', 'B7', 'C2', 'C9', 'E10']) expect(BOTIGA_SKILLS, id).toContain(id)
    for (const id of ['C4', 'D2', 'C8']) expect(BOTIGA_SKILLS).not.toContain(id)
  })

  it('every item of every botiga skill is playable: adapted, or tokens holding the answer', () => {
    fc.assert(
      fc.property(fc.constantFrom(...BOTIGA_SKILLS), fc.string({ minLength: 1, maxLength: 8 }), fc.constantFrom(...CPA_STAGES), (skillId, seed, stage) => {
        const it = item(skillId, seed, stage)
        const adapter = pickAdapter(BOTIGA_ADAPTERS, it)
        if (!adapter) {
          expect(it.choices.map((c) => c.value)).toContain(it.answer)
          return
        }
        const built = adapter.build(it)
        expect(built.request.text.length).toBeGreaterThan(0)
        if (adapter.id === 'cistella') {
          const task = basketFromItem(it)
          if (!task) throw new Error('adaptat sense tasca')
          expect(String(basketValue(task, solutionCount(task)))).toBe(it.answer)
          expect(solutionCount(task)).toBeLessThanOrEqual(BASKET_MAX)
        } else {
          const task = payFromItem(it)
          if (!task) throw new Error('adaptat sense tasca')
          expect(sumCents(breakdown(task.target))).toBe(parseEuros(it.answer))
          // The drawer always holds the exact change.
          expect(sumCents(task.drawer)).toBeGreaterThanOrEqual(task.target)
          expect(payChoice(task.target, it).value).toBe(it.answer)
        }
      }),
      { numRuns: 400 },
    )
  })
})

describe('basket adapter', () => {
  it('sum, missing addend and take away', () => {
    expect(basketFromItem(base)).toMatchObject({ mode: 'sum', a: 7, b: 5, start: 0 })
    const missing = { ...base, text: '6 + ? = 10', answer: '4', operands: { a: 6, b: 4, op: '+' as const } }
    const m = basketFromItem(missing)
    expect(m).toMatchObject({ mode: 'missing', start: 6 })
    expect(m && basketValue(m, 10)).toBe(4)
    const take = { ...base, text: '12 − 5 = ?', answer: '7', operands: { a: 12, b: 5, op: '-' as const } }
    expect(basketFromItem(take)).toMatchObject({ mode: 'take', start: 12 })
  })

  it('refuses what does not fit a basket', () => {
    expect(basketFromItem({ ...base, operands: { a: 40, b: 30, op: '+' }, answer: '70' })).toBeUndefined()
    expect(basketFromItem({ ...base, operands: undefined })).toBeUndefined()
    expect(basketFromItem({ ...base, answer: '3,50 €' })).toBeUndefined()
    expect(basketFromItem({ ...base, operands: { a: 3, b: 4, op: '×' }, answer: '12' })).toBeUndefined()
    expect(() => basketAdapter.toTask({ ...base, operands: undefined })).toThrow()
  })

  it('speaks Catalan requests with the expression', () => {
    const sum = basketFromItem(base)
    if (!sum) throw new Error('sense tasca')
    expect(basketRequest(sum).text).toMatch(/^Vull 7 \+ 5 \S+! Posa/)
    expect(basketRequest(sum).speech).toMatch(/7 més 5/)
    const take = basketFromItem({ ...base, text: '12 − 5 = ?', answer: '7', operands: { a: 12, b: 5, op: '-' } })
    if (!take) throw new Error('sense tasca')
    expect(basketRequest(take).text).toMatch(/^12 − 5: tinc 12/)
    expect(basketRequest({ ...take, mode: 'missing', a: 1, b: 2 }).text).toMatch(/Tinc 1 \S+, però en vull 3/)
  })

  it('counts stay inside the basket', () => {
    expect(addOne(BASKET_MAX)).toBe(BASKET_MAX)
    expect(takeOne(0)).toBe(0)
  })
})

describe('pay adapter', () => {
  const change = item('C9', 'canvi-1')
  const changeItem = /canvi/.test(change.text) ? change : { ...change, text: 'Compra pa que costa 3,50 € i paga amb 5,00 €. Quant canvi li tornen?', answer: '1,50 €', operands: { a: 500, b: 350, op: '-' as const } }

  it('adapts change questions and builds a drawer', () => {
    expect(payAdapter.canAdapt(changeItem)).toBe(true)
    expect(payAdapter.canAdapt(base)).toBe(false)
    expect(payRequest(changeItem).text).toMatch(/costa .* i et pago amb .*Quant canvi em tornes/)
    expect(payRequest({ ...changeItem, operands: undefined }).text).toMatch(/Dona el canvi amb monedes!$/)
    expect(() => payAdapter.toTask(base)).toThrow()
  })

  it('moves pieces between drawer and tray without losing any', () => {
    const task = payAdapter.toTask(changeItem)
    const drawer = drawerPieces(task)
    const first = drawer[0]
    if (!first) throw new Error('calaix buit')
    const moved = movePiece(drawer, [], first.key)
    expect(moved.from).toHaveLength(drawer.length - 1)
    expect(trayTotal(moved.to)).toBe(first.cents)
    expect(movePiece(drawer, [], 'cap')).toEqual({ from: drawer, to: [] })
  })

  it('maps a wrong total to a wrong choice, never to the answer', () => {
    const c = payChoice(1, changeItem)
    expect(c.value).not.toBe(changeItem.answer)
  })
})

describe('choiceForValue', () => {
  it('right value → answer; wrong value → the matching choice with its misconception, or the plain value', () => {
    expect(choiceForValue('12', base)).toEqual({ value: '12' })
    expect(choiceForValue('11', base)).toEqual({ value: '11', misconception: 'off-by-one' })
    expect(choiceForValue('9', base)).toEqual({ value: '9' })
  })
})
