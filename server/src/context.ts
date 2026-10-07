import type { Config } from './config.js'
import type { Db } from './db/connection.js'
import type { PasswordHasher } from './lib/password.js'
import type { WindowLimiter } from './lib/windowLimiter.js'

/** Everything a route needs. Injected so tests can control the clock and the database. */
export interface AppContext {
  readonly config: Config
  readonly db: Db
  readonly hasher: PasswordHasher
  readonly now: () => number
  /** L5: wrong current passwords per family (change-password, account deletion). */
  readonly reauthFailures: WindowLimiter
}
