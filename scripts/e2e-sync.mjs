// Builds the API server (server/) and runs the Playwright `sync` project against it (real accounts + sync).
import { spawnSync } from 'node:child_process'

const run = (command, env = {}) => {
  const { status } = spawnSync(command, { stdio: 'inherit', shell: true, env: { ...process.env, ...env } })
  if (status !== 0) process.exit(status ?? 1)
}

run('npm --prefix server run build')
run(`npx playwright test --project=sync ${process.argv.slice(2).join(' ')}`, { SYNC_E2E: '1' })
