import type { CharacterId, ThemeColor } from '../../core/storage/db'
import type { AvatarSpec, PaletteColor } from '../../world/model/types'

/**
 * The avatar replaced the old «character + colour» steps, but the profile keeps both fields: the colour
 * themes the adults' pages and the album, and the character becomes her first pet. Both follow the
 * colour of the top she chose.
 */
const THEME_OF: Readonly<Record<PaletteColor, ThemeColor>> = {
  lila: 'lila',
  neu: 'lila',
  rosa: 'rosa',
  coral: 'taronja',
  mango: 'taronja',
  xocolata: 'taronja',
  cel: 'blau',
  menta: 'menta',
  llima: 'menta',
  carbo: 'negre',
}

const PET_OF: Readonly<Record<PaletteColor, CharacterId>> = {
  carbo: 'nyx',
  lila: 'mixa',
  neu: 'mixa',
  cel: 'blau',
  menta: 'nuvol',
  llima: 'nuvol',
  rosa: 'melo',
  coral: 'melo',
  mango: 'blau',
  xocolata: 'blau',
}

export function profileFromAvatar(spec: Pick<AvatarSpec, 'top'>): { character: CharacterId; color: ThemeColor } {
  return { character: PET_OF[spec.top.color], color: THEME_OF[spec.top.color] }
}
