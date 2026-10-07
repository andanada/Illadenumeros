import type { Choice, GenerateContext, Item } from '../../../core/ambit/types'
import { makeItem } from './itemFactory'

const MULTIPLE_BASES = [4, 6, 8, 9] as const
const DIVISOR_TARGETS = [12, 18, 20, 24, 30, 36, 40, 42, 48] as const

const asChoices = (rng: GenerateContext['rng'], answer: number, wrong: readonly Choice[]): Choice[] => rng.shuffle([{ value: String(answer) }, ...wrong])
const wrongChoice = (value: number, misconception?: Choice['misconception']): Choice => ({ value: String(value), ...(misconception ? { misconception } : {}) })

function multipleItem(ctx: GenerateContext): Item {
  const { rng } = ctx
  const base = rng.pick(MULTIPLE_BASES)
  const k = rng.int(3, 9)
  const answer = base * k
  const divisor = base % 2 === 0 ? 2 : 3
  const wrong = [wrongChoice(divisor, 'multiple-divisor-swap'), wrongChoice(answer + 1, 'off-by-one'), wrongChoice(answer + base - 2)]
  const text = `Quin d’aquests nombres és múltiple de ${base}?`
  return makeItem(
    {
      skillId: 'E8',
      text,
      speech: text,
      answer,
      choices: asChoices(rng, answer, wrong),
      visual: { kind: 'none' },
      hints: [`Els múltiples de ${base} són els de la taula del ${base}.`, `Compta de ${base} en ${base}: ${[1, 2, 3].map((i) => base * i).join(', ')}…`, `${answer} = ${base} × ${k}, així que és múltiple de ${base}.`],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

function divisorItem(ctx: GenerateContext): Item {
  const { rng } = ctx
  const target = rng.pick(DIVISOR_TARGETS)
  const divisors = Array.from({ length: target / 2 - 1 }, (_, i) => i + 2).filter((d) => target % d === 0)
  const answer = rng.pick(divisors)
  const others = rng.shuffle(Array.from({ length: target - 3 }, (_, i) => i + 3).filter((d) => target % d !== 0 && d !== answer)).slice(0, 2)
  const wrong = [wrongChoice(target * 2, 'multiple-divisor-swap'), ...others.map((d) => wrongChoice(d, Math.abs(d - answer) === 1 ? 'off-by-one' : undefined))]
  const text = `Quin d’aquests nombres és divisor de ${target}?`
  return makeItem(
    {
      skillId: 'E8',
      text,
      speech: text,
      answer,
      choices: asChoices(rng, answer, wrong),
      visual: { kind: 'none' },
      hints: [`Un divisor de ${target} el reparteix exactament, sense que sobri res.`, `Prova ${target} : cada nombre i mira si el residu és 0.`, `${target} : ${answer} = ${target / answer}, exacte; per tant ${answer} és divisor de ${target}.`],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** Multiples and divisors: pick the one that fits (E8). */
export function generateMultiplesDivisors(ctx: GenerateContext): Item {
  return ctx.rng.next() < 0.5 ? multipleItem(ctx) : divisorItem(ctx)
}
