import type { GenerateContext, Item } from '../../../core/ambit/types'
import { buildChoices, type Candidate } from './distractors'
import { makeItem } from './itemFactory'

function square(ctx: GenerateContext): Item {
  const { rng } = ctx
  const n = rng.int(2, 10)
  const answer = n * n
  const list: Candidate[] = [
    { value: n * 2, misconception: 'power-as-multiple' },
    { value: answer + n, misconception: 'adjacent-fact' },
    { value: answer - n, misconception: 'adjacent-fact' },
    { value: answer + 1, misconception: 'off-by-one' },
  ]
  return makeItem(
    {
      skillId: 'E7',
      text: `${n}² = ?`,
      speech: `Quant fa ${n} al quadrat?`,
      answer,
      choices: buildChoices(answer, list, rng, { min: 1, max: 130 }),
      visual: { kind: 'array', rows: n, cols: n },
      hints: [`Un quadrat de ${n} files amb ${n} fitxes a cada fila.`, `${n}² vol dir ${n} × ${n}, no ${n} × 2.`, `${n} × ${n} = ${answer}`],
      cpaStage: ctx.cpaStage,
      operands: { a: n, b: n, op: '×' },
    },
    rng,
  )
}

function cube(ctx: GenerateContext): Item {
  const { rng } = ctx
  const n = rng.int(2, 5)
  const sq = n * n
  const answer = sq * n
  const list: Candidate[] = [
    { value: n * 3, misconception: 'power-as-multiple' },
    { value: sq, misconception: 'power-as-multiple' },
    { value: answer + n, misconception: 'adjacent-fact' },
    { value: answer - n, misconception: 'adjacent-fact' },
  ]
  return makeItem(
    {
      skillId: 'E7',
      text: `${n}³ = ?`,
      speech: `Quant fa ${n} al cub?`,
      answer,
      choices: buildChoices(answer, list, rng, { min: 1, max: 200 }),
      visual: { kind: 'none' },
      hints: [`Un cub de ${n} per ${n} per ${n}: tres capes d’un quadrat de ${n} per ${n}.`, `${n}³ vol dir ${n} × ${n} × ${n}, no ${n} × 3.`, `${n} × ${n} = ${sq}, ${sq} × ${n} = ${answer}`],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

function root(ctx: GenerateContext): Item {
  const { rng } = ctx
  const isCube = rng.next() < 0.3
  const n = isCube ? rng.int(2, 5) : rng.int(2, 10)
  const power = isCube ? n * n * n : n * n
  const word = isCube ? 'cub' : 'quadrat'
  const list: Candidate[] = [
    { value: n + 1, misconception: 'off-by-one' },
    { value: n - 1, misconception: 'off-by-one' },
    ...(power % (isCube ? 3 : 2) === 0 ? [{ value: power / (isCube ? 3 : 2), misconception: 'power-as-multiple' as const }] : []),
  ]
  const steps = isCube ? `${n} × ${n} × ${n} = ${power}` : `${n} × ${n} = ${power}`
  return makeItem(
    {
      skillId: 'E7',
      text: `Quin nombre elevat al ${word} dona ${power}?`,
      speech: `Quin nombre elevat al ${word} dona ${power}?`,
      answer: n,
      choices: buildChoices(n, list, rng, { min: 1, max: 60 }),
      visual: { kind: 'none' },
      hints: [`Busca un nombre que multiplicat ${isCube ? 'tres cops' : 'per ell mateix'} doni ${power}.`, 'Prova amb els quadrats que ja coneixes: 4, 9, 16, 25…', steps],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** Squares and cubes: n², n³ and the number behind them (E7). */
export function generatePowers(ctx: GenerateContext): Item {
  const r = ctx.rng.next()
  return r < 0.5 ? square(ctx) : r < 0.75 ? cube(ctx) : root(ctx)
}
