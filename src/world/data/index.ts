/**
 * Public API of the town data layer (src/world/data). Other folders import ONLY from here.
 *
 *   useWorld(): WorldView                              React hook: avatar, owned, placed, pets, coins + actions
 *   grantCoins(amount: number, reason: string): Promise<boolean>
 *       Errand solved -> coins (1..1000, serialised with the answers). record() already gives 3/1 per answer.
 *   buyItem(entry: CatalogEntry): Promise<BuyResult>   atomic; never negative; idempotent if owned; food is consumed
 *   saveAvatar(spec: AvatarSpec): Promise<WorldResult> only owned or price-0 parts (eyes/mouth always allowed)
 *   placeItem(scene, placement) / movePlaced(scene, uid, patch) / removePlaced(scene, uid): Promise<WorldResult>
 *   adoptPet(petId: string): Promise<WorldResult>      catalogue pet, bought or free
 *   grantItem(id: string, reason: string): Promise<WorldResult>  free gift (daily board surprise); petalsSpent unchanged
 *   catalogEntries(): readonly CatalogEntry[]          everything the data layer knows a price for
 *   registerCatalog(entries: readonly CatalogEntry[]): number   places register furniture/pets/food prices
 *   currentCoins(): number, loadWorld(), worldDataPort (same shape as the scene's WorldPort)
 */
export { catalogEntries, catalogEntry, isFree, registerCatalog } from './catalog'
export { defaultWorld } from './defaultWorld'
export { useWorld, worldDataPort, type WorldView } from './useWorld'
export type { BuyResult, PlacementPatch, WorldFailure, WorldResult } from './worldLogic'
export {
  adoptPet,
  buyItem,
  currentCoins,
  grantCoins,
  grantItem,
  loadWorld,
  movePlaced,
  placeItem,
  removePlaced,
  saveAvatar,
  useWorldStore,
  type CoinGrant,
} from './worldStore'
