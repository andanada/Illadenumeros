import type { Profile } from '../../core/storage/db'
import type { WorldRow } from '../../core/storage/worldRow'
import { defaultAvatar } from '../characters/wearables'

/**
 * The world row of a player who never opened the town: avatar from their character and colour,
 * nothing owned, placed or adopted, no coins spent. `avatarUpdatedAt: 0` so any real choice made on
 * another device wins the merge.
 */
export function defaultWorld(profile: Pick<Profile, 'character' | 'color'> | undefined): WorldRow {
  return {
    id: 'world',
    avatar: defaultAvatar(profile?.character ?? 'nyx', profile?.color ?? 'lila'),
    owned: [],
    placed: {},
    placedAt: {},
    pets: [],
    avatarUpdatedAt: 0,
    petalsSpent: 0,
  }
}
