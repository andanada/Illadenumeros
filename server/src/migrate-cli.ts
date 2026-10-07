import { assertDatabaseWritable, loadConfig } from './config.js'
import { openDatabase } from './db/connection.js'
import { migrate } from './db/migrate.js'

const config = loadConfig()
assertDatabaseWritable(config.databasePath)
const db = openDatabase(config.databasePath)
const applied = migrate(db)
db.close()
process.stdout.write(applied.length === 0 ? 'No pending migrations\n' : `Applied migrations: ${applied.join(', ')}\n`)
