import { db } from '../db/index'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(import.meta.dir, '../../drizzle')

async function runMigrations() {
  const files = await readdir(MIGRATIONS_DIR)
  const sqlFiles = files
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log(`Found ${sqlFiles.length} migration files`)

  for (const file of sqlFiles) {
    const path = join(MIGRATIONS_DIR, file)
    const content = await Bun.file(path).text()
    console.log(`Running: ${file}`)
    await db.execute(content)
  }

  console.log('All migrations complete')
  process.exit(0)
}

runMigrations().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
