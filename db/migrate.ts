import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { migrate } from 'drizzle-orm/neon-serverless/migrator'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool)
  await migrate(db, { migrationsFolder: './db/migrations' })
  await pool.end()
  console.log('Migrations applied.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
