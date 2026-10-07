import type { GenerateContext, Item, VisualModel } from '../../../core/ambit/types'
import { buildChoices, type Candidate } from './distractors'
import { makeItem } from './itemFactory'
import { count, reverse } from './numbers'

interface Digits {
  thousands: number
  hundreds: number
  tens: number
  ones: number
}

const digitsOf = (n: number): Digits => ({
  thousands: Math.floor(n / 1000),
  hundreds: Math.floor((n % 1000) / 100),
  tens: Math.floor((n % 100) / 10),
  ones: n % 10,
})

/** "3 centenes, 0 desenes i 5 unitats" (thousands only when present). */
function expanded(d: Digits): string {
  const parts = [
    ...(d.thousands > 0 ? [count(d.thousands, 'unitat de miler', 'unitats de miler')] : []),
    count(d.hundreds, 'centena', 'centenes'),
    count(d.tens, 'desena', 'desenes'),
  ]
  return `${parts.join(', ')} i ${count(d.ones, 'unitat', 'unitats')}`
}

/** Typical errors when composing a number: lost zeros, digits concatenated or reversed. */
function placeValueCandidates(n: number): Candidate[] {
  const d = digitsOf(n)
  const withoutZeros = Number(String(n).replace(/0/g, '') || '0')
  const list: Candidate[] = [
    { value: reverse(n), misconception: 'reverse-digits' },
    { value: n + 10, misconception: 'off-by-one' },
    { value: n - 10, misconception: 'off-by-one' },
    { value: n + 100, misconception: 'off-by-one' },
  ]
  if (withoutZeros !== n) list.push({ value: withoutZeros, misconception: 'place-value-zero' })
  if (d.tens === 0 || d.ones === 0) list.push({ value: Number(`${d.thousands || ''}${d.hundreds}${d.ones}${d.tens}`), misconception: 'place-value-zero' })
  list.push({ value: Number(`${d.thousands > 0 ? d.thousands : ''}${d.hundreds}0${d.tens}${d.ones}`), misconception: 'place-value-concat' })
  return list.filter((c) => c.value !== n)
}

/** A digit is often 0 so that zero place holders get practised. */
function numberWithZeros(ctx: GenerateContext, min: number, max: number): number {
  const n = ctx.rng.int(min, max)
  const roll = ctx.rng.next()
  if (roll < 0.2) return n - (n % 100) + (n % 10) // tens = 0
  if (roll < 0.35) return n - (n % 10) // ones = 0
  return n
}

const lineAround = (start: number, target: number): VisualModel => {
  const from = Math.floor(Math.min(start, target) / 100) * 100
  return { kind: 'numberLine', from, to: Math.ceil((Math.max(start, target) + 1) / 100) * 100, start, target }
}

function composeItem(skillId: 'C1' | 'D1', n: number, ctx: GenerateContext, visual: VisualModel, max: number): Item {
  const d = digitsOf(n)
  const text = `Quin nombre té ${expanded(d)}?`
  return makeItem(
    {
      skillId,
      text,
      speech: text,
      answer: n,
      choices: buildChoices(n, placeValueCandidates(n), ctx.rng, { min: 0, max: max + 999 }),
      visual,
      hints: [
        skillId === 'C1' ? 'Cada placa és 100, cada barra 10 i cada cubet 1.' : 'Escriu una xifra per a cada columna: milers, centenes, desenes i unitats.',
        'Si una columna no en té cap, hi va un 0.',
        `És el ${n}.`,
      ],
      cpaStage: ctx.cpaStage,
    },
    ctx.rng,
  )
}

function stepItem(skillId: 'C1' | 'D1', n: number, step: number, ctx: GenerateContext, max: number): Item {
  const up = n + step <= max && (n - step < (skillId === 'C1' ? 100 : 1000) || ctx.rng.next() < 0.6)
  const target = up ? n + step : n - step
  const word = up ? 'més' : 'menys'
  const place = step === 1000 ? 'dels milers' : step === 100 ? 'de les centenes' : 'de les desenes'
  return makeItem(
    {
      skillId,
      text: `Quin nombre és ${step} ${word} que ${n}?`,
      speech: `Quin nombre és ${step} ${word} que ${n}?`,
      answer: target,
      choices: buildChoices(
        target,
        [
          { value: up ? n + step / 10 : n - step / 10, misconception: 'place-value-zero' },
          { value: up ? n - step : n + step, misconception: 'wrong-direction' },
          { value: up ? n + 1 : n - 1, misconception: 'off-by-one' },
        ].filter((c): c is Candidate => Number.isInteger(c.value)),
        ctx.rng,
        { min: 0, max: max + 999 },
      ),
      visual: lineAround(n, target),
      hints: [`Mira la recta: fes un salt de ${step}.`, `${up ? 'Suma' : 'Resta'} 1 a la xifra ${place}.`, `${n} ${up ? '+' : '−'} ${step} = ${target}`],
      cpaStage: ctx.cpaStage,
    },
    ctx.rng,
  )
}

/** Hundreds, tens and ones up to 1.000 (C1). */
export function generatePlaceValue1000(ctx: GenerateContext): Item {
  if (ctx.rng.next() < 0.3) return stepItem('C1', ctx.rng.int(100, 990), ctx.rng.pick([10, 100]), ctx, 1000)
  const n = numberWithZeros(ctx, 101, 999)
  const d = digitsOf(n)
  return composeItem('C1', n, ctx, { kind: 'blocks', hundreds: d.hundreds, tens: d.tens, ones: d.ones }, 1000)
}

/** Numbers up to 9.999: compose from place values and jump by 10, 100 or 1.000 (D1). */
export function generatePlaceValue9999(ctx: GenerateContext): Item {
  if (ctx.rng.next() < 0.4) return stepItem('D1', ctx.rng.int(1000, 9990), ctx.rng.pick([10, 100, 1000]), ctx, 9999)
  const n = numberWithZeros(ctx, 1001, 9999)
  return composeItem('D1', n, ctx, lineAround(n - (n % 1000), n), 9999)
}
