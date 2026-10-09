import type { Item } from '../../../../core/ambit/types'
import { isInteger } from '../../../errands/adapters'
import { countWord } from '../../../errands/requestText'
import { ingredientFor, type Ingredient } from './ingredients'

/** The bowl holds two ten-frames: the first one fills to ten, then the second (bridging ten shows). */
export const BOWL_MAX = 20

/**
 * Cooking errands:
 * - sum:  a + b = ?          → the bowl starts empty; she puts in a + b      → answer = ingredients in the bowl
 * - fill: a + ? = t / t = a + ? → the bowl already has a; she adds up to t    → answer = ingredients added
 */
export type BowlMode = 'sum' | 'fill'

export interface BowlTask {
  mode: BowlMode
  ingredient: Ingredient
  /** sum: the two addends. fill: a = already in the bowl, b = missing. */
  a: number
  b: number
  /** Ingredients already in the bowl when the cook arrives. */
  start: number
  /** The skill flavours the request (doubles, make ten…). */
  skillId: string
}

const SPLIT_RE = /^(\d+) = (\d+) \+ \?$/
const FRIEND_RE = /^(\d+) \+ \? = (\d+)$/

/** Reads "10 = 6 + ?" (A3) or "6 + ? = 10" (A5) as { whole, part }. */
function parseFill(item: Item): { whole: number; part: number } | undefined {
  const text = item.text.trim()
  const split = SPLIT_RE.exec(text)
  if (split) return { whole: Number(split[1]), part: Number(split[2]) }
  const friend = FRIEND_RE.exec(text)
  if (friend) return { whole: Number(friend[2]), part: Number(friend[1]) }
  return undefined
}

export function bowlFromItem(item: Item): BowlTask | undefined {
  if (!isInteger(item.answer)) return undefined
  const answer = Number(item.answer)
  const ingredient = ingredientFor(item.id)
  const base = { ingredient, skillId: item.skillId }
  const fill = parseFill(item)
  if (fill) {
    const { whole, part } = fill
    if (part < 0 || whole > BOWL_MAX || part > whole || whole - part !== answer) return undefined
    return { ...base, mode: 'fill', a: part, b: answer, start: part }
  }
  const ops = item.operands
  if (ops?.op === '+' && ops.a >= 0 && ops.b >= 0 && ops.a + ops.b === answer && answer <= BOWL_MAX && item.text.trim().endsWith('= ?')) {
    return { ...base, mode: 'sum', a: ops.a, b: ops.b, start: 0 }
  }
  return undefined
}

/** Value the bowl gives as an answer, from the number of ingredients in it. */
export const bowlValue = (task: BowlTask, count: number): number => (task.mode === 'sum' ? count : count - task.start)

/** Ingredients in the bowl that answer correctly (shown as the solution). */
export const bowlSolution = (task: BowlTask): number => task.a + task.b

/** One more in (never above the max) / one out (never below what was already there). Pure. */
export const addOne = (count: number): number => Math.min(BOWL_MAX, count + 1)
export const takeOne = (task: BowlTask, count: number): number => Math.max(task.start, count - 1)

const isDouble = (t: BowlTask): boolean => t.a === t.b
const isNearDouble = (t: BowlTask): boolean => Math.abs(t.a - t.b) === 1

/** The cook's words, in Catalan, with the expression on the recipe. */
export function bowlRequest(task: BowlTask): { text: string; speech: string } {
  const { ingredient: i, a, b } = task
  const them = i.gender === 'f' ? 'Posa-les' : 'Posa’ls'
  if (task.mode === 'fill') {
    const whole = a + b
    const missing = i.gender === 'f' ? 'les que falten' : 'els que falten'
    return {
      text: `Per a ${i.dish} calen ${countWord(whole, i.one, i.many)}. Al bol ja n’hi ha ${a}: ${a} + ? = ${whole}. Posa ${missing}!`,
      speech: `Per a ${i.dish} calen ${countWord(whole, i.one, i.many)}. Al bol ja n’hi ha ${a}. Posa ${missing}!`,
    }
  }
  const flavour = isDouble(task) ? ' És un doble!' : isNearDouble(task) && task.skillId === 'A7' ? ' Gairebé un doble!' : task.skillId === 'A8' ? ' Omple primer la desena!' : ''
  return {
    text: `Per a ${i.dish}: ${a} + ${b} ${i.many}.${flavour} ${them} al bol!`,
    speech: `Per a ${i.dish} necessito ${a} més ${b} ${i.many}.${flavour} ${them} al bol!`,
  }
}
