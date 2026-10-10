import { vi } from 'vitest'
import { matesAmbit } from '../../../../ambits/mates'
import type { Item } from '../../../../core/ambit/types'
import { createRng } from '../../../../core/rng'

/**
 * The question flow seeds its first item from `Date.now()`. A test that needs a certain kind of item looks for a
 * timestamp whose first item for `skillId` (new child: concrete stage) satisfies `wanted`, and then renders with the
 * clock pinned to it. Call `pin(ts)` just before render and `unpin()` right after.
 */
export function findSeed(skillId: string, wanted: (item: Item) => boolean): number {
  const generator = matesAmbit.generators[skillId]
  if (!generator) throw new Error(`Sense generador per a ${skillId}`)
  for (let ts = 1_700_000_000_000; ts < 1_700_000_000_000 + 2000; ts++) {
    if (wanted(generator({ rng: createRng(`${ts}:1`), cpaStage: 'concret' }))) return ts
  }
  throw new Error(`Cap ítem de ${skillId} compleix la condició`)
}

export const pin = (ts: number): void => void vi.spyOn(Date, 'now').mockReturnValue(ts)
export const unpin = (): void => void vi.mocked(Date.now).mockRestore()
