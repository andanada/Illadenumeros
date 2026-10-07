// Builds the production bundle and runs the Playwright `pwa` project against it.
import { spawnSync } from 'node:child_process'

const run = (command, env = {}) => {
  const { status } = spawnSync(command, { stdio: 'inherit', shell: true, env: { ...process.env, ...env } })
  if (status !== 0) process.exit(status ?? 1)
}

run('npm run build')
run(`npx playwright test --project=pwa ${process.argv.slice(2).join(' ')}`, { PWA_E2E: '1' })
