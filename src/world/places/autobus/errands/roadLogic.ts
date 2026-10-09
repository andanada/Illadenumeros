import type { Item } from '../../../../core/ambit/types'
import { canJump, LINE_MAX, LINE_MIN, positionAfter, windowFor, type Jump } from '../../../../games/cursa-recta/jumpLogic'
import { isInteger } from '../../../errands/adapters'
import { parseMissing } from './seatsLogic'

/**
 * The bus line is a number line: every stop has a number. The child drives with +10 / +1 / −1 / −10
 * (the same jumps as Cursa a la Recta) and the arcs of the trip stay drawn on the road.
 * - go:    a ± b = ?           → drive b stops from a, open the doors      → answer = the stop
 * - count: a + ? = t           → drive from a to the waiting neighbour at t → answer = stops driven (tickets)
 * - read:  where is the arrow? → drive to the neighbour on an unnumbered stop → answer = its number (tickets)
 */
export type RoadMode = 'go' | 'count' | 'read'

export interface RoadTask {
  mode: RoadMode
  start: number
  /** The stop to reach (the answer for 'go'; the neighbour's stop for 'count' and 'read'). */
  target: number
  /** 'read': the stretch of the line drawn with only its two ends numbered. */
  window?: { lo: number; hi: number }
  /** 'go': stops to drive and the direction (for the request). */
  b: number
  op: '+' | '-'
  /** '? + b = t': she got on somewhere, rode b stops and is at t; drive back to where she got on. */
  unknownStart?: boolean
}

const inLine = (...n: number[]): boolean => n.every((v) => Number.isInteger(v) && v >= LINE_MIN && v <= LINE_MAX)

export function roadFromItem(item: Item): RoadTask | undefined {
  if (!isInteger(item.answer)) return undefined
  const answer = Number(item.answer)
  const ops = item.operands
  if (ops && (ops.op === '+' || ops.op === '-')) {
    const { a, b, op } = ops
    const target = op === '+' ? a + b : a - b
    if (target === answer && inLine(a, target)) return { mode: 'go', start: a, target, b, op }
    if (op === '+' && answer === b && inLine(a, a + b)) return { mode: 'count', start: a, target: a + b, b, op }
    return undefined
  }
  const m = parseMissing(item.text)
  if (m && m.unknown === 'first' && answer === m.a && inLine(m.t, m.a))
    return { mode: 'go', start: m.t, target: m.a, b: m.b, op: '-', unknownStart: true }
  if (m && m.unknown === 'second' && answer === m.b && inLine(m.a, m.t)) return { mode: 'count', start: m.a, target: m.t, b: m.b, op: '+' }
  const line = item.visual.kind === 'numberLine' ? item.visual : item.hintVisual.kind === 'numberLine' ? item.hintVisual : undefined
  if (line && line.target === answer && inLine(line.from, line.to, line.target) && line.to > line.from) {
    return {
      mode: 'read',
      start: line.from,
      target: line.target,
      window: { lo: line.from, hi: line.to },
      b: line.target - line.from,
      op: '+',
    }
  }
  return undefined
}

/** Stretch of road drawn: the read window, or one that holds the trip (multiples of 10). */
export const roadWindow = (t: RoadTask, positions: readonly number[]): { lo: number; hi: number } =>
  t.window ?? windowFor(positions, t.target)

/** Can the bus make this jump (stays on the line, and inside the read window)? */
export function canDrive(t: RoadTask, position: number, jump: Jump): boolean {
  if (!canJump(position, jump)) return false
  if (!t.window) return true
  const next = position + jump
  return next >= t.window.lo && next <= t.window.hi
}

/** The bus reached the neighbour's stop (tickets appear for 'count' and 'read'). */
export const arrived = (t: RoadTask, jumps: readonly Jump[]): boolean => positionAfter(t.start, jumps) === t.target

/** Stops driven so far (each +1/−1 is one stop, each ±10 is ten). */
export const stopsDriven = (t: RoadTask, jumps: readonly Jump[]): number => Math.abs(positionAfter(t.start, jumps) - t.start)

/** The fewest jumps that drive from `from` to `to` (tens first): the solution drawn after the last try. */
export function solutionJumps(from: number, to: number): Jump[] {
  const d = to - from
  const sign = d >= 0 ? 1 : -1
  const tens = Math.floor(Math.abs(d) / 10)
  const ones = Math.abs(d) % 10
  return [...Array.from({ length: tens }, () => (10 * sign) as Jump), ...Array.from({ length: ones }, () => sign as Jump)]
}

export function roadRequest(t: RoadTask): { text: string; speech: string } {
  switch (t.mode) {
    case 'go': {
      if (t.unknownStart) {
        const text = `? + ${t.b} = ${t.start}: he fet ${t.b} parades i ara som a la ${t.start}. On he pujat? Torna-hi i obre les portes!`
        return { text, speech: `He fet ${t.b} parades i ara som a la ${t.start}. On he pujat? Torna-hi i obre les portes!` }
      }
      const sign = t.op === '+' ? '+' : '−'
      const word = t.op === '+' ? 'més' : 'menys'
      const way = t.op === '+' ? 'endavant' : 'enrere'
      return {
        text: `Som a la parada ${t.start}. Vull baixar ${t.b} parades ${way}: ${t.start} ${sign} ${t.b}. Porta’m-hi i obre les portes!`,
        speech: `Som a la parada ${t.start}. Vull baixar ${t.b} parades ${way}: ${t.start} ${word} ${t.b}. Porta’m-hi i obre les portes!`,
      }
    }
    case 'count':
      return {
        text: `Som a la parada ${t.start} i m’espera la meva amiga a la ${t.target}: ${t.start} + ? = ${t.target}. Quantes parades hi ha fins a la ${t.target}?`,
        speech: `Som a la parada ${t.start} i m’espera la meva amiga a la ${t.target}. Quantes parades hi ha fins a la ${t.target}?`,
      }
    case 'read':
      return {
        text: `La meva amiga espera en una parada sense número. Condueix fins allà: quin número té la parada?`,
        speech: `La meva amiga espera en una parada sense número. Condueix fins allà: quin número té la parada?`,
      }
  }
}
