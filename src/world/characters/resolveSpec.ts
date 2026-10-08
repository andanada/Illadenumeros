import type { AvatarSpec, PaletteColor } from '../model/types'
import { ACCESSORIES_BY_ID } from './kit/accessories'
import { BOTTOMS, BOTTOMS_BY_ID } from './kit/bottoms'
import { EYES, EYES_BY_ID, MOUTHS, MOUTHS_BY_ID } from './kit/face'
import type { AccessoryDef, BottomDef, FaceDef, HairDef, ShoeDef, TopDef } from './kit/geometry'
import { HAIR, HAIR_BY_ID } from './kit/hair'
import { SHOES, SHOES_BY_ID } from './kit/shoes'
import { TOPS, TOPS_BY_ID } from './kit/tops'

export interface ResolvedAvatar {
  skin: AvatarSpec['skin']
  hair: { def: HairDef; color: PaletteColor }
  eyes: FaceDef
  mouth: FaceDef
  top: { def: TopDef; color: PaletteColor }
  bottom: { def: BottomDef; color: PaletteColor }
  shoes: { def: ShoeDef; color: PaletteColor }
  accessory: { def: AccessoryDef; color: PaletteColor } | null
}

function first<T>(list: readonly T[]): T {
  const item = list[0]
  if (item === undefined) throw new Error('Empty part list')
  return item
}

/**
 * Turns ids into drawable parts. Unknown ids (e.g. an item from a newer app version synced from
 * another device) fall back to the first part of the category instead of crashing the render.
 */
export function resolveSpec(spec: AvatarSpec): ResolvedAvatar {
  const accessory = spec.accessory ? ACCESSORIES_BY_ID[spec.accessory.item] : undefined
  return {
    skin: spec.skin,
    hair: { def: HAIR_BY_ID[spec.hair.style] ?? first(HAIR), color: spec.hair.color },
    eyes: EYES_BY_ID[spec.eyes] ?? first(EYES),
    mouth: MOUTHS_BY_ID[spec.mouth] ?? first(MOUTHS),
    top: { def: TOPS_BY_ID[spec.top.item] ?? first(TOPS), color: spec.top.color },
    bottom: { def: BOTTOMS_BY_ID[spec.bottom.item] ?? first(BOTTOMS), color: spec.bottom.color },
    shoes: { def: SHOES_BY_ID[spec.shoes.item] ?? first(SHOES), color: spec.shoes.color },
    accessory: accessory && spec.accessory ? { def: accessory, color: spec.accessory.color } : null,
  }
}

