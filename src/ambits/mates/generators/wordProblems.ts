import type { GenerateContext, Item } from '../../../core/ambit/types'
import { CHARACTERS, CONTAINERS, countOf, eachOne, howMany, pickDistinct, THINGS, type Noun } from './catalan'
import { buildChoices, type Candidate } from './distractors'
import { makeItem } from './itemFactory'

interface Problem {
  text: string
  /** Strategy hint: which two steps to do. */
  plan: string
  /** "3 × 4 = 12, 12 − 5 = 7". */
  worked: string
  answer: number
  candidates: Candidate[]
}

/** Plural article / weak pronoun agreeing with the noun: "les" / "els". */
const article = (noun: Noun): string => (noun.feminine ? 'les' : 'els')
const capitalised = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1)

const twoNames = (ctx: GenerateContext): [string, string] => {
  const [first = 'Nyx', second = 'Mixa'] = pickDistinct(ctx.rng, CHARACTERS, 2)
  return [first, second]
}

/** Trays of items, some eaten: a × b − c. */
function traysEaten(ctx: GenerateContext, noun: Noun, box: Noun): Problem {
  const { rng } = ctx
  const [name] = twoNames(ctx)
  const a = rng.int(2, 5)
  const b = rng.int(2, 6)
  const p = a * b
  const c = rng.int(2, p - 2)
  const r = p - c
  return {
    text: `${name} prepara ${a} ${box.plural} amb ${countOf(b, noun)} ${eachOne(box)}. Se’n mengen ${c}. ${howMany(noun)} queden?`,
    plan: `Primer calcula ${howMany(noun).toLowerCase()} hi ha en total (${a} × ${b}) i després treu ${article(noun)} que es mengen.`,
    worked: `${a} × ${b} = ${p}, ${p} − ${c} = ${r}`,
    answer: r,
    candidates: [
      { value: p, misconception: 'one-step-only' },
      { value: p + c, misconception: 'operation-swap' },
      { value: a + b - c, misconception: 'mult-as-add' },
      { value: r + 1, misconception: 'off-by-one' },
    ],
  }
}

/** Some items plus bags bought: c + a × b. */
function bagsBought(ctx: GenerateContext, noun: Noun, box: Noun): Problem {
  const { rng } = ctx
  const [name] = twoNames(ctx)
  const a = rng.int(2, 5)
  const b = rng.int(2, 10)
  const c = rng.int(2, 15)
  const p = a * b
  const r = p + c
  return {
    text: `${name} té ${countOf(c, noun)} i compra ${a} ${box.plural} de ${b}. ${howMany(noun)} té ara?`,
    plan: `Primer calcula ${noun.feminine ? 'quantes' : 'quants'} en compra (${a} × ${b}) i després suma ${article(noun)} que ja tenia.`,
    worked: `${a} × ${b} = ${p}, ${p} + ${c} = ${r}`,
    answer: r,
    candidates: [
      { value: p, misconception: 'one-step-only' },
      { value: a + b + c, misconception: 'mult-as-add' },
      { value: a * (b + 1) + c, misconception: 'adjacent-fact' },
      { value: r - 1, misconception: 'off-by-one' },
    ],
  }
}

/** Two children put their items together and share them: (x + y) : k. */
function joinAndShare(ctx: GenerateContext, noun: Noun): Problem {
  const { rng } = ctx
  const [first, second] = twoNames(ctx)
  const k = rng.int(2, 5)
  const r = rng.int(2, 6)
  const s = k * r
  const x = rng.int(2, s - 2)
  const y = s - x
  return {
    text: `${first} té ${countOf(x, noun)} i ${second} en té ${y}. ${capitalised(article(noun))} ajunten i ${article(noun)} reparteixen entre ${k} amics a parts iguals. ${howMany(noun)} rep cada amic?`,
    plan: `Primer suma les dues quantitats i després reparteix-les entre ${k}.`,
    worked: `${x} + ${y} = ${s}, ${s} : ${k} = ${r}`,
    answer: r,
    candidates: [
      { value: s, misconception: 'one-step-only' },
      { value: s - k, misconception: 'div-as-sub' },
      { value: r + 1, misconception: 'adjacent-fact' },
      { value: r - 1, misconception: 'adjacent-fact' },
    ],
  }
}

/** Buying several notebooks and getting the money left: m − k × p. */
function shopping(ctx: GenerateContext): Problem {
  const { rng } = ctx
  const [name] = twoNames(ctx)
  const k = rng.int(2, 5)
  const price = rng.int(2, 6)
  const t = k * price
  const m = t + rng.int(1, 10)
  const r = m - t
  return {
    text: `${name} té ${m} euros. Compra ${k} llibretes que costen ${price} euros cada una. Quants euros li queden?`,
    plan: `Primer calcula quant costen les ${k} llibretes (${k} × ${price}) i després resta-ho dels ${m} euros.`,
    worked: `${k} × ${price} = ${t}, ${m} − ${t} = ${r}`,
    answer: r,
    candidates: [
      { value: t, misconception: 'one-step-only' },
      { value: m - k - price, misconception: 'mult-as-add' },
      { value: m - price, misconception: 'one-step-only' },
      { value: r + 1, misconception: 'off-by-one' },
    ],
  }
}

/** Some items eaten, the rest shared: (t − c) : k. */
function eatAndShare(ctx: GenerateContext, noun: Noun): Problem {
  const { rng } = ctx
  const [name] = twoNames(ctx)
  const k = rng.int(2, 5)
  const r = rng.int(2, 6)
  const s = k * r
  const c = rng.int(2, 9)
  const t = s + c
  const rest = `${article(noun)} que queden`
  return {
    text: `${name} té ${countOf(t, noun)}. Se’n menja ${c} i reparteix ${rest} entre ${k} amics a parts iguals. ${howMany(noun)} rep cada amic?`,
    plan: `Primer treu ${article(noun)} que es menja (${t} − ${c}) i després reparteix entre ${k}.`,
    worked: `${t} − ${c} = ${s}, ${s} : ${k} = ${r}`,
    answer: r,
    candidates: [
      { value: s, misconception: 'one-step-only' },
      { value: s - k, misconception: 'div-as-sub' },
      { value: r + 1, misconception: 'adjacent-fact' },
      { value: Math.floor(t / k), misconception: 'operation-swap' },
    ],
  }
}

/** Two-step word problems mixing + − × : (C10). */
export function generateTwoStepProblem(ctx: GenerateContext): Item {
  const { rng } = ctx
  const noun = rng.pick(THINGS)
  const box = rng.pick(CONTAINERS)
  const builders = [() => traysEaten(ctx, noun, box), () => bagsBought(ctx, noun, box), () => joinAndShare(ctx, noun), () => shopping(ctx), () => eatAndShare(ctx, noun)]
  const problem = rng.pick(builders)()
  return makeItem(
    {
      skillId: 'C10',
      text: problem.text,
      speech: problem.text,
      answer: problem.answer,
      choices: buildChoices(problem.answer, problem.candidates.filter((c) => c.value !== problem.answer && c.value >= 0), rng, { min: 0, max: 200 }),
      visual: { kind: 'none' },
      hints: ['Llegeix-lo a poc a poc: hi ha dues preguntes amagades.', problem.plan, problem.worked],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}
