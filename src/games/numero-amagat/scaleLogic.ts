export type ScaleOp = '+' | '−' | '×' | ':'
export type Operand = number | 'hidden'

/** `a op b = result` with exactly one hidden operand. */
export interface Equation {
  readonly a: Operand
  readonly op: ScaleOp
  readonly b: Operand
  readonly result: number
}

export type Verdict = 'balanced' | 'left-heavy' | 'right-heavy'

export interface BalanceState {
  readonly left: number
  readonly right: number
  readonly verdict: Verdict
  /** Beam rotation in degrees, clockwise positive (right side down). */
  readonly angle: number
}

export interface Token {
  readonly kind: 'number' | 'op' | 'slot'
  readonly text: string
}

const MAX_ANGLE = 14
const MIN_VISIBLE_ANGLE = 5
const DEGREES_PER_UNIT = 2.5

const OPERAND = String.raw`(\d+|\?)`
const OP = String.raw`([+×:−-])`
const FORWARD = new RegExp(`^${OPERAND} ${OP} ${OPERAND} = (\\d+)$`)
const REVERSED = new RegExp(`^(\\d+) = ${OPERAND} ${OP} ${OPERAND}$`)

const toOperand = (raw: string): Operand => (raw === '?' ? 'hidden' : Number(raw))
const toOp = (raw: string): ScaleOp => (raw === '-' ? '−' : (raw as ScaleOp))

/** Reads the text of a "número que falta" item; undefined when it is not that kind of equation. */
export function parseEquation(text: string): Equation | undefined {
  const clean = text.replace(/\s+/g, ' ').trim()
  const forward = FORWARD.exec(clean)
  const reversed = forward ? undefined : REVERSED.exec(clean)
  const parts = forward
    ? { a: forward[1], op: forward[2], b: forward[3], result: forward[4] }
    : reversed
      ? { a: reversed[2], op: reversed[3], b: reversed[4], result: reversed[1] }
      : undefined
  if (!parts?.a || !parts.op || !parts.b || !parts.result) return undefined
  const a = toOperand(parts.a)
  const b = toOperand(parts.b)
  if ((a === 'hidden') === (b === 'hidden')) return undefined
  return { a, op: toOp(parts.op), b, result: Number(parts.result) }
}

const whole = (n: number): number | undefined => (Number.isInteger(n) && n >= 0 ? n : undefined)

/** The number that makes both sides equal, when it is a whole number. */
export function missingValue(eq: Equation): number | undefined {
  const known = eq.a === 'hidden' ? eq.b : eq.a
  if (known === 'hidden') return undefined
  const hiddenFirst = eq.a === 'hidden'
  switch (eq.op) {
    case '+':
      return whole(eq.result - known)
    case '−':
      return whole(hiddenFirst ? eq.result + known : known - eq.result)
    case '×':
      return known === 0 ? undefined : whole(eq.result / known)
    case ':':
      if (hiddenFirst) return whole(eq.result * known)
      return eq.result === 0 ? undefined : whole(known / eq.result)
  }
}

function apply(op: ScaleOp, a: number, b: number): number {
  switch (op) {
    case '+':
      return a + b
    case '−':
      return a - b
    case '×':
      return a * b
    case ':':
      return b === 0 ? 0 : a / b
  }
}

/** Weight of the left pan; an empty slot weighs nothing. */
export function leftValue(eq: Equation, guess: number | null): number {
  const value = guess ?? 0
  return apply(eq.op, eq.a === 'hidden' ? value : eq.a, eq.b === 'hidden' ? value : eq.b)
}

/** Beam rotation in degrees (clockwise positive): bounded, with a small visible tilt whenever unbalanced. */
export function beamAngle(left: number, right: number): number {
  const diff = right - left
  if (diff === 0) return 0
  const raw = Math.min(MAX_ANGLE, Math.max(MIN_VISIBLE_ANGLE, Math.abs(diff) * DEGREES_PER_UNIT))
  return Math.sign(diff) * raw
}

export function balanceState(eq: Equation, guess: number | null): BalanceState {
  const left = leftValue(eq, guess)
  const right = eq.result
  const verdict: Verdict = Math.abs(left - right) < 1e-9 ? 'balanced' : left > right ? 'left-heavy' : 'right-heavy'
  return { left, right, verdict, angle: verdict === 'balanced' ? 0 : beamAngle(left, right) }
}

/** Left pan as display tokens: number, operator, number, with the slot where the hidden number goes. */
export function expressionTokens(eq: Equation, guess: number | null): Token[] {
  const operand = (o: Operand): Token => (o === 'hidden' ? { kind: 'slot', text: guess === null ? '?' : String(guess) } : { kind: 'number', text: String(o) })
  return [operand(eq.a), { kind: 'op', text: eq.op }, operand(eq.b)]
}
