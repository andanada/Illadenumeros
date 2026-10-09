import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { matesAmbit } from '../../../../ambits/mates'
import { CPA_STAGES, type Item } from '../../../../core/ambit/types'
import { createRng } from '../../../../core/rng'
import { positionAfter } from '../../../../games/cursa-recta/jumpLogic'
import { choiceForValue, pickAdapter } from '../../../errands/adapters'
import { AUTOBUS_SKILLS } from '../autobusSkills'
import { AUTOBUS_ADAPTERS, roadAdapter, seatsAdapter } from './autobusAdapters'
import { canDrive, roadFromItem, solutionJumps } from './roadLogic'
import { SEATS, seatsFromItem, seatsValue, solutionOnBoard } from './seatsLogic'

const item = (skillId: string, seed: string, stage: (typeof CPA_STAGES)[number] = 'concret'): Item => {
  const gen = matesAmbit.generators[skillId]
  if (!gen) throw new Error(skillId)
  return gen({ rng: createRng(seed), cpaStage: stage })
}

describe('autobús skills', () => {
  it('serves adds and subtracts of the A and B series, the number line and tens', () => {
    for (const id of ['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'B2', 'B4', 'B5', 'B6', 'B7']) expect(AUTOBUS_SKILLS).toContain(id)
    for (const id of AUTOBUS_SKILLS) expect(matesAmbit.generators[id], id).toBeDefined()
  })

  it('every item of every skill, in every CPA stage, is playable on the bus (and most are adapted)', () => {
    const adapted = new Map<string, number>()
    fc.assert(
      fc.property(
        fc.constantFrom(...AUTOBUS_SKILLS),
        fc.string({ minLength: 1, maxLength: 8 }),
        fc.constantFrom(...CPA_STAGES),
        (skillId, seed, stage) => {
          const it = item(skillId, seed, stage)
          expect(it.choices.map((c) => c.value)).toContain(it.answer)
          const adapter = pickAdapter(AUTOBUS_ADAPTERS, it)
          if (!adapter) return
          adapted.set(skillId, (adapted.get(skillId) ?? 0) + 1)
          expect(adapter.build(it).request.text.length).toBeGreaterThan(0)
          if (adapter.id === 'seients') {
            const task = seatsFromItem(it)
            if (!task) throw new Error('adaptat sense tasca')
            expect(String(seatsValue(task, solutionOnBoard(task)))).toBe(it.answer)
            expect(solutionOnBoard(task)).toBeLessThanOrEqual(SEATS)
            // Enough people wait at the stop for the solution, plus some more so she has to count.
            if (task.mode !== 'off') expect(task.start + task.waiting).toBeGreaterThan(solutionOnBoard(task))
          } else {
            const task = roadFromItem(it)
            if (!task) throw new Error('adaptat sense tasca')
            const path = solutionJumps(task.start, task.target)
            expect(positionAfter(task.start, path)).toBe(task.target)
            // The road always lets the bus get there.
            path.reduce((at, j) => {
              expect(canDrive(task, at, j)).toBe(true)
              return at + j
            }, task.start)
            if (task.mode === 'go') expect(choiceForValue(String(task.target), it).value).toBe(it.answer)
          }
        },
      ),
      { numRuns: 600 },
    )
    // Every skill has at least one in-world task (the fallback tickets are a safety net, not the rule).
    for (const id of AUTOBUS_SKILLS) {
      const any = CPA_STAGES.flatMap((st) => ['a', 'b', 'c', 'd', 'e'].map((s) => item(id, `${s}${id}`, st))).some((it) =>
        pickAdapter(AUTOBUS_ADAPTERS, it),
      )
      expect(any, id).toBe(true)
    }
  })

  it('routes small sums to the seats and big ones / the line to the road', () => {
    expect(pickAdapter(AUTOBUS_ADAPTERS, item('A4', 'x'))?.id).toBe('seients')
    expect(pickAdapter(AUTOBUS_ADAPTERS, item('A9', 'x'))?.id).toBe('seients')
    expect(pickAdapter(AUTOBUS_ADAPTERS, item('B5', 'x'))?.id).toBe('parades')
    expect(pickAdapter(AUTOBUS_ADAPTERS, item('B2', 'x'))?.id).toBe('parades')
  })

  it('adapters refuse what they cannot play', () => {
    const base = item('A4', 'x')
    expect(() => seatsAdapter.toTask({ ...base, operands: undefined, text: 'Quants n’hi ha?' })).toThrow()
    expect(() =>
      roadAdapter.toTask({ ...base, operands: undefined, text: 'Quants n’hi ha?', visual: { kind: 'none' }, hintVisual: { kind: 'none' } }),
    ).toThrow()
    expect(seatsAdapter.canAdapt({ ...base, answer: '3,50 €' })).toBe(false)
  })
})
