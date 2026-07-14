import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import * as schema from './schema'

// The WebSocket (not HTTP) driver — needed for real interactive
// transactions (BEGIN/COMMIT across multiple reads+writes), which the
// recurring-income catch-up sweep and credit-card payoff both require.
neonConfig.webSocketConstructor = ws

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const db = drizzle(pool, { schema })
