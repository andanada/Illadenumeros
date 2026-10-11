/** "8 + ? = 10", "10 = 3 + ?", "? + 2 = 9" read from an item's text (A3, A10 have no operands). */
export function parseMissing(text: string): { a: number; b: number; t: number; unknown: 'first' | 'second' } | undefined {
  const clean = text.replace(/\s+/g, ' ').trim()
  const after = /^(\d+) \+ \? = (\d+)$/.exec(clean)
  const before = /^(\d+) = (\d+) \+ \?$/.exec(clean)
  const second = after ? { a: Number(after[1]), t: Number(after[2]) } : before ? { a: Number(before[2]), t: Number(before[1]) } : undefined
  if (second) return second.t >= second.a ? { a: second.a, b: second.t - second.a, t: second.t, unknown: 'second' } : undefined
  const left = /^\? \+ (\d+) = (\d+)$/.exec(clean)
  if (left) {
    const b = Number(left[1])
    const t = Number(left[2])
    return t >= b ? { a: t - b, b, t, unknown: 'first' } : undefined
  }
  return undefined
}
