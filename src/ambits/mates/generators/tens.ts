import type { GenerateContext, Item } from '../../../core/ambit/types'
import { factsForSkill } from '../facts'
import { buildChoices } from './distractors'
import { makeItem, parseFactKey, tenKey } from './itemFactory'

/** "Amics del 10": 7 + ? = 10 (A5). */
export function generateTenFriends(ctx: GenerateContext): Item {
  const known = ctx.factKey && factsForSkill('A5').includes(ctx.factKey) ? ctx.factKey : undefined
  const fact = parseFactKey(known ?? ctx.rng.pick(factsForSkill('A5')))
  const a = fact?.a ?? 5
  const missing = 10 - a
  return makeItem(
    {
      skillId: 'A5',
      factKey: tenKey(a),
      text: `${a} + ? = 10`,
      speech: `Quin és l’amic del ${a} per fer 10?`,
      answer: missing,
      choices: buildChoices(missing, [
        { value: missing + 1, misconception: 'off-by-one' },
        { value: missing - 1, misconception: 'off-by-one' },
        { value: a, misconception: 'operation-swap' },
      ], ctx.rng, { min: 0, max: 10 }),
      visual: { kind: 'tenFrame', a, b: 0, op: '+' },
      hints: ['Compta les caselles buides del marc de deu.', `${a} i quants fan 10? Compta des de ${a} fins a 10.`, `${a} + ${missing} = 10`],
      cpaStage: ctx.cpaStage,
      operands: { a, b: missing, op: '+' },
    },
    ctx.rng,
  )
}

/** Split 5 or 10 into two parts: 10 = 3 + ? (A3). */
export function generateDecompose(ctx: GenerateContext): Item {
  const total = ctx.rng.pick([5, 6, 7, 8, 9, 10, 10, 10])
  const part = ctx.rng.int(1, total - 1)
  const missing = total - part
  return makeItem(
    {
      skillId: 'A3',
      text: `${total} = ${part} + ?`,
      speech: `${total} és ${part} i quants més?`,
      answer: missing,
      choices: buildChoices(missing, [
        { value: missing + 1, misconception: 'off-by-one' },
        { value: missing - 1, misconception: 'off-by-one' },
        { value: total + part, misconception: 'operation-swap' },
      ], ctx.rng, { min: 0, max: 20 }),
      visual: { kind: 'dots', groups: [part, missing] },
      hints: [`Mira els ${total} punts: n’hi ha ${part} d’un color.`, `Compta des de ${part} fins a ${total}.`, `${total} = ${part} + ${missing}`],
      cpaStage: ctx.cpaStage,
    },
    ctx.rng,
  )
}

/** Missing addend: ? + 3 = 8 or 5 + ? = 8 (A10). */
export function generateMissingAddend(ctx: GenerateContext): Item {
  const total = ctx.rng.int(4, 12)
  const known = ctx.rng.int(1, total - 1)
  const missing = total - known
  const missingFirst = ctx.rng.next() < 0.5
  const text = missingFirst ? `? + ${known} = ${total}` : `${known} + ? = ${total}`
  return makeItem(
    {
      skillId: 'A10',
      text,
      speech: `Quin número s’amaga? ${missingFirst ? `Alguna cosa més ${known}` : `${known} més alguna cosa`} fa ${total}.`,
      answer: missing,
      choices: buildChoices(missing, [
        { value: total + known, misconception: 'operation-swap' },
        { value: total, misconception: 'wrong-direction' },
        { value: missing + 1, misconception: 'off-by-one' },
      ], ctx.rng, { min: 0, max: 24 }),
      visual: { kind: 'dots', groups: [known, missing] },
      hints: ['És com una balança: als dos costats hi ha d’haver el mateix.', `Compta des de ${known} fins a ${total}.`, `${missingFirst ? `${missing} + ${known}` : `${known} + ${missing}`} = ${total}`],
      cpaStage: ctx.cpaStage,
    },
    ctx.rng,
  )
}
