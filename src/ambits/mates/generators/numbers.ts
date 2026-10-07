import type { GenerateContext, Item } from '../../../core/ambit/types'
import { buildChoices, symbolChoices } from './distractors'
import { makeItem } from './itemFactory'

export const reverse = (n: number): number => Number(String(n).split('').reverse().join(''))
export const count = (n: number, singular: string, plural: string): string => `${n} ${n === 1 ? singular : plural}`

/** How many are there? up to 20 (A1). */
export function generateCount(ctx: GenerateContext): Item {
  const n = ctx.rng.int(3, 20)
  const groups = n > 10 ? [10, n - 10] : [n]
  return makeItem(
    {
      skillId: 'A1',
      text: 'Quants n’hi ha?',
      speech: 'Quants n’hi ha?',
      answer: n,
      choices: buildChoices(n, [
        { value: n + 1, misconception: 'off-by-one' },
        { value: n - 1, misconception: 'off-by-one' },
      ], ctx.rng, { min: 1, max: 20 }),
      visual: { kind: 'dots', groups },
      hints: ['Toca cada punt mentre comptes.', n > 10 ? 'Un marc ple són 10: compta a partir de 10.' : 'Compta de 2 en 2 per anar més ràpid.', `N’hi ha ${n}.`],
      cpaStage: ctx.cpaStage === 'abstracte' ? 'pictoric' : ctx.cpaStage,
    },
    ctx.rng,
  )
}

/** < > = between two numbers (A2 up to 20, B3 up to 199). */
export function generateCompare(skillId: 'A2' | 'B3', ctx: GenerateContext): Item {
  const max = skillId === 'A2' ? 20 : 199
  const left = ctx.rng.int(1, max)
  const roll = ctx.rng.next()
  const right =
    roll < 0.15 ? left : skillId === 'B3' && left >= 10 && roll < 0.4 && reverse(left) <= max ? reverse(left) : ctx.rng.int(1, max)
  const answer = left < right ? '<' : left > right ? '>' : '='
  return makeItem(
    {
      skillId,
      text: `${left} ? ${right}`,
      speech: `Quin signe va entre ${left} i ${right}?`,
      answer,
      choices: symbolChoices(ctx.rng),
      visual: { kind: 'compare', left, right },
      hints: ['La boca del monstre sempre s’obre cap al número més gran.', skillId === 'B3' ? 'Mira primer les centenes, després les desenes.' : 'Quin és més a la dreta a la recta?', `${left} ${answer} ${right}`],
      cpaStage: ctx.cpaStage,
    },
    ctx.rng,
  )
}

/** Tens and ones up to 199 with base-ten blocks (B1). */
export function generatePlaceValue(ctx: GenerateContext): Item {
  const n = ctx.rng.int(11, 199)
  const hundreds = Math.floor(n / 100)
  const tens = Math.floor((n % 100) / 10)
  const ones = n % 10
  const reversed = reverse(n)
  return makeItem(
    {
      skillId: 'B1',
      text: 'Quin nombre és?',
      speech: 'Quin nombre formen aquests blocs?',
      answer: n,
      choices: buildChoices(n, [
        { value: reversed, misconception: 'reverse-digits' },
        { value: n + 10, misconception: 'off-by-one' },
        { value: n - 10, misconception: 'off-by-one' },
        { value: Number(`${hundreds * 10 + tens}0${ones}`), misconception: 'place-value-concat' },
      ], ctx.rng, { min: 0, max: 999 }),
      visual: { kind: 'blocks', hundreds, tens, ones },
      hints: [
        'Cada barra són 10 i cada cubet és 1.',
        `Hi ha ${hundreds > 0 ? `${count(hundreds, 'centena', 'centenes')}, ` : ''}${count(tens, 'desena', 'desenes')} i ${count(ones, 'unitat', 'unitats')}.`,
        `És el ${n}.`,
      ],
      cpaStage: ctx.cpaStage === 'abstracte' ? 'pictoric' : ctx.cpaStage,
    },
    ctx.rng,
  )
}

/** Which number is marked on the number line? (B2). */
export function generateNumberLine(ctx: GenerateContext): Item {
  const from = ctx.rng.int(0, 18) * 10
  const target = from + ctx.rng.int(1, 9)
  return makeItem(
    {
      skillId: 'B2',
      text: 'Quin número assenyala la fletxa?',
      speech: 'Quin número assenyala la fletxa?',
      answer: target,
      choices: buildChoices(target, [
        { value: target + 1, misconception: 'off-by-one' },
        { value: target - 1, misconception: 'off-by-one' },
        { value: from + 10 - (target - from), misconception: 'wrong-direction' },
      ], ctx.rng, { min: 0, max: 199 }),
      visual: { kind: 'numberLine', from, to: from + 10, start: from, target },
      hints: ['Compta les ratlletes des del número de l’esquerra.', `Comença a ${from} i compta d’1 en 1.`, `La fletxa és al ${target}.`],
      cpaStage: 'pictoric',
    },
    ctx.rng,
  )
}
