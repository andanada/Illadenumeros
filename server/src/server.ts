import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { createLogger } from './logger.js'
import { runMaintenance } from './maintenance.js'

const MAINTENANCE_INTERVAL_MS = 60 * 60_000

async function main(): Promise<void> {
  process.umask(0o077) // M4: first thing: every file this process creates (db, -wal/-shm, dirs) is private.
  const config = loadConfig()
  const logger = createLogger(config.logLevel)
  const { app, ctx } = await buildApp({ config, logger })

  const runJobs = (): void => {
    try {
      const report = runMaintenance(ctx.db, config, Date.now())
      logger.info(report, 'maintenance')
    } catch (error) {
      logger.error({ errName: error instanceof Error ? error.name : 'unknown' }, 'maintenance failed')
    }
  }
  runJobs()
  const timer = setInterval(runJobs, MAINTENANCE_INTERVAL_MS)
  timer.unref()

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down')
    clearInterval(timer)
    await app.close()
    ctx.db.close()
    process.exit(0)
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  await app.listen({ host: config.host, port: config.port })
}

main().catch((error: unknown) => {
  // Logger may not exist yet (config errors): write a single line to stderr without any env values.
  process.stderr.write(`fatal: ${error instanceof Error ? error.message : 'startup failed'}\n`)
  process.exit(1)
})
