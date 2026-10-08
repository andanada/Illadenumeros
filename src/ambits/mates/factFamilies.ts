import { addKey, divKey, mulKey, parseFactKey, subKey } from './generators/itemFactory'
import { factOwner } from './operations'

const unique = (keys: string[]): string[] => [...new Set(keys)]

function candidates(key: string): string[] {
  const fact = parseFactKey(key)
  if (!fact) return []
  const { a, b } = fact
  switch (fact.kind) {
    case 'add':
      return [subKey(a + b, a), subKey(a + b, b)]
    case 'c10':
      return [addKey(a, b), subKey(10, a), subKey(10, b)]
    case 'sub': {
      const rest = a - b
      return [addKey(b, rest), subKey(a, rest)]
    }
    case 'mul':
      return a === 0 || b === 0 ? [divKey(0, Math.max(a, b))] : [divKey(a * b, a), divKey(a * b, b)]
    case 'div': {
      if (b === 0) return []
      const quotient = a / b
      return quotient === 0 ? [mulKey(0, b)] : [mulKey(b, quotient), divKey(a, quotient)]
    }
    default:
      return []
  }
}

/**
 * The other facts of the same family (8+5 -> 13-5, 13-8; 7x8 -> 56:7, 56:8). The commutative twin
 * (5+8, 8x7) is the same fact key: it is asked in the other order, not listed here.
 */
export function factFamily(key: string): string[] {
  return unique(candidates(key)).filter((partner) => partner !== key && factOwner(partner) !== undefined)
}
