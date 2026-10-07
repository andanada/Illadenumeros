/** Decimal helpers: every value is an integer number of hundredths, so there is never float noise. */

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n))

/** Catalan decimal text: 350 → "3,5", 305 → "3,05", 300 → "3". `keepZero` writes 350 as "3,50". */
export function formatDecimal(hundredths: number, keepZero = false): string {
  const whole = Math.floor(hundredths / 100)
  const frac = hundredths % 100
  if (frac === 0) return keepZero ? `${whole},00` : String(whole)
  if (frac % 10 === 0 && !keepZero) return `${whole},${frac / 10}`
  return `${whole},${pad2(frac)}`
}

/** Parses "3,5" / "3,05" / "3" back to hundredths; undefined when it is not a decimal. */
export function parseDecimal(text: string): number | undefined {
  const m = /^(\d+)(?:,(\d{1,2}))?$/.exec(text.trim())
  if (!m) return undefined
  const frac = m[2] === undefined ? 0 : Number(m[2].padEnd(2, '0'))
  return Number(m[1]) * 100 + frac
}

/** How a decimal is read aloud: 305 → "3 coma 0 5". */
export function speakDecimal(hundredths: number): string {
  const text = formatDecimal(hundredths)
  return text.replace(',', ' coma ').replace(/ coma 0(\d)/, ' coma zero $1')
}
