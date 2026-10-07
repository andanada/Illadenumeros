import { z } from 'zod'
import packageJson from '../../../package.json?raw'

const versionSchema = z.object({ version: z.string().min(1) })

function readVersion(raw: string): string {
  try {
    const parsed = versionSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data.version : 'desconeguda'
  } catch {
    return 'desconeguda'
  }
}

export const APP_VERSION = readVersion(packageJson)
