import type { Config } from './config.js'
import { checkpointAfterDelete, type Db } from './db/connection.js'
import { pruneAudit, pruneThrottle } from './repo/audit.js'
import { purgeSoftDeletedBefore } from './repo/profiles.js'
import { deleteExpiredSessions } from './repo/sessions.js'

export interface MaintenanceReport {
  readonly profilesPurged: number
  readonly auditPruned: number
  readonly sessionsExpired: number
  readonly throttlePruned: number
}

/** Retention jobs: hard-delete soft-deleted profiles after the grace period, prune audit, sessions, throttles. */
export function runMaintenance(db: Db, config: Config, now: number): MaintenanceReport {
  const report = db.transaction(
    (): MaintenanceReport => ({
      profilesPurged: purgeSoftDeletedBefore(db, now - config.purgeAfterMs),
      auditPruned: pruneAudit(db, now - config.auditRetentionMs),
      sessionsExpired: deleteExpiredSessions(db, now),
      throttlePruned: pruneThrottle(db, now - config.loginLockoutMs * 2),
    }),
  )()
  // L1: purged rows must not linger in the WAL file.
  if (report.profilesPurged > 0) checkpointAfterDelete(db)
  return report
}
