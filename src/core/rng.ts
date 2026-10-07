import seedrandom from 'seedrandom'

export interface Rng {
  /** Float in [0, 1). */
  next: () => number
  /** Integer in [min, max], both inclusive. */
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
  shuffle: <T>(items: readonly T[]) => T[]
}

export function createRng(seed: string): Rng {
  const random = seedrandom(seed)

  const int = (min: number, max: number): number => {
    if (max < min) throw new Error(`Rang invàlid: ${min}..${max}`)
    return min + Math.floor(random() * (max - min + 1))
  }

  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('No es pot triar d’una llista buida')
    return items[int(0, items.length - 1)] as T
  }

  const shuffle = <T,>(items: readonly T[]): T[] => {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i)
      const tmp = copy[i] as T
      copy[i] = copy[j] as T
      copy[j] = tmp
    }
    return copy
  }

  return { next: () => random(), int, pick, shuffle }
}
