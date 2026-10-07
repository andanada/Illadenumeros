import { useProgress } from '../core/progress/store'
import { emptyRewards, type MatesDb } from '../core/storage/db'
import { getDb, playerDbName, setActivePlayerDb } from '../core/storage/playerDbs'

/** Back to the state of a freshly started app: nobody selected, nothing loaded. */
export function resetStoreForTest(): void {
  setActivePlayerDb(undefined)
  useProgress.setState({
    loaded: false,
    storageError: false,
    players: [],
    activePlayerId: undefined,
    profile: undefined,
    skillStates: {},
    factStates: {},
    rewards: emptyRewards(),
    sessionResults: [],
  })
}

/**
 * For tests of a single child: makes a fresh player database active (without the registry)
 * and returns it, so the test can seed and inspect the rows directly.
 */
export function activateTestPlayer(): MatesDb {
  const id = crypto.randomUUID()
  resetStoreForTest()
  setActivePlayerDb(playerDbName(id))
  useProgress.setState({ loaded: true, activePlayerId: id })
  return getDb()
}
