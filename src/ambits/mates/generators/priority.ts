import type { GenerateContext, Item } from '../../../core/ambit/types'
import type { Rng } from '../../../core/rng'
import { buildChoices, type Candidate } from './distractors'
import { makeItem } from './itemFactory'

interface Expression {
  text: string
  value: number
  /** What a child gets working strictly left to right (or ignoring the brackets). */
  naive: number
  /** Worked steps in order. */
  steps: string
  /** Strategy: what to do first. */
  first: string
}

const mulFirst = (a: number, b: number, c: number, sign: '+' | '−'): Expression => {
  const prod = b * c
  const value = sign === '+' ? a + prod : a - prod
  const naive = sign === '+' ? (a + b) * c : (a - b) * c
  return {
    text: `${a} ${sign} ${b} × ${c}`,
    value,
    naive,
    steps: `${b} × ${c} = ${prod}, ${a} ${sign} ${prod} = ${value}`,
    first: `La multiplicació va abans: ${b} × ${c}.`,
  }
}

const bracketsMul = (a: number, b: number, c: number, sign: '+' | '−'): Expression => {
  const inside = sign === '+' ? a + b : a - b
  return {
    text: `(${a} ${sign} ${b}) × ${c}`,
    value: inside * c,
    naive: sign === '+' ? a + b * c : a - b * c,
    steps: `${a} ${sign} ${b} = ${inside}, ${inside} × ${c} = ${inside * c}`,
    first: `Els parèntesis manen: fes primer ${a} ${sign} ${b}.`,
  }
}

const divFirst = (a: number, b: number, c: number): Expression => {
  const quotient = b / c
  return {
    text: `${a} + ${b} : ${c}`,
    value: a + quotient,
    naive: (a + b) / c,
    steps: `${b} : ${c} = ${quotient}, ${a} + ${quotient} = ${a + quotient}`,
    first: `La divisió va abans: ${b} : ${c}.`,
  }
}

const mulBracketDiff = (a: number, b: number, c: number): Expression => {
  const inside = b - c
  return {
    text: `${a} × (${b} − ${c})`,
    value: a * inside,
    naive: a * b - c,
    steps: `${b} − ${c} = ${inside}, ${a} × ${inside} = ${a * inside}`,
    first: `Fes primer el parèntesi: ${b} − ${c}.`,
  }
}

function pickExpression(rng: Rng): Expression {
  const kind = rng.int(0, 5)
  switch (kind) {
    case 0:
      return mulFirst(rng.int(2, 20), rng.int(2, 9), rng.int(2, 9), '+')
    case 1:
      return mulFirst(rng.int(30, 60), rng.int(2, 5), rng.int(2, 5), '−')
    case 2:
      return bracketsMul(rng.int(2, 12), rng.int(2, 12), rng.int(2, 9), '+')
    case 3:
      return bracketsMul(rng.int(26, 40), rng.int(2, 5), rng.int(2, 5), '−')
    case 4: {
      const c = rng.int(2, 9)
      return divFirst(c * rng.int(1, 6), c * rng.int(2, 9), c)
    }
    default: {
      const c = rng.int(1, 8)
      return mulBracketDiff(rng.int(2, 9), c + rng.int(2, 9), c)
    }
  }
}

/** Order of operations with brackets, × and : before + and − (E6). */
export function generatePriority(ctx: GenerateContext): Item {
  const { rng } = ctx
  const e = pickExpression(rng)
  const list: Candidate[] = [
    { value: e.naive, misconception: 'order-of-operations' },
    { value: e.value + 1, misconception: 'off-by-one' },
    { value: e.value - 1, misconception: 'off-by-one' },
  ]
  return makeItem(
    {
      skillId: 'E6',
      text: `${e.text} = ?`,
      speech: `Quant fa ${e.text.replace(/\(/g, 'obre parèntesi ').replace(/\)/g, ' tanca parèntesi').replace(/−/g, 'menys').replace(/×/g, 'per').replace(/:/g, 'entre').replace(/\+/g, 'més')}?`,
      answer: e.value,
      choices: buildChoices(e.value, list.filter((c) => Number.isInteger(c.value) && c.value !== e.value), rng, { min: 0, max: Math.max(100, e.value * 2, e.naive) }),
      visual: { kind: 'none' },
      hints: ['Mira què s’ha de fer primer: parèntesis, després × i :, i al final + i −.', e.first, e.steps],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}
