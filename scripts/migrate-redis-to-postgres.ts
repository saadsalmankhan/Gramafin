// One-off migration: reads every user's data out of the old single-JSON-blob
// Redis storage (read-only, never mutates Redis) and writes it into the new
// Postgres schema via Drizzle. Every upsert is keyed on the schema's real
// composite PKs, so the entire script is safe to run repeatedly — this is
// what makes the "dry run against a scratch branch, then run for real, then
// run once more right after deploy" rollout plan work. Which environment
// this actually writes to is controlled entirely by DATABASE_URL — point it
// at a scratch Neon branch for a dry run, or the real production database to
// cut over for real.
//
// Run via: npx tsx scripts/migrate-redis-to-postgres.ts

import { redis } from '@/lib/redis'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { AppState, EXPENSE_CATEGORIES, DEFAULT_BUDGETS, DEFAULT_PREFERENCES } from '@/types'

interface StoredUser {
  id: string
  email: string
  name: string
  passwordHash: string
  emailVerified: boolean
  createdAt: string
}

async function migrateUser(userKey: string): Promise<void> {
  const user = await redis.get<StoredUser>(userKey)
  if (!user) {
    console.warn(`  [skip] ${userKey}: key vanished between listing and read`)
    return
  }

  const blob = await redis.get<AppState>(`data:${user.id}`)

  await db.transaction(async (tx) => {
    await tx
      .insert(schema.users)
      .values({
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      })

    const prefs = { ...DEFAULT_PREFERENCES, ...blob?.preferences }
    await tx
      .insert(schema.preferences)
      .values({ userId: user.id, currency: prefs.currency, stockMarket: prefs.stockMarket })
      .onConflictDoUpdate({
        target: schema.preferences.userId,
        set: { currency: prefs.currency, stockMarket: prefs.stockMarket },
      })

    // Iterate the known 8 categories, not Object.keys(blob.budgets) — Redis
    // has no schema, and an unknown category key would violate the new
    // CHECK constraint.
    for (const category of EXPENSE_CATEGORIES) {
      const amount = blob?.budgets?.[category] ?? DEFAULT_BUDGETS[category]
      await tx
        .insert(schema.budgetLimits)
        .values({ userId: user.id, category, amount })
        .onConflictDoUpdate({
          target: [schema.budgetLimits.userId, schema.budgetLimits.category],
          set: { amount },
        })
    }

    if (!blob) return

    for (const b of blob.bankAccounts ?? []) {
      await tx
        .insert(schema.bankAccounts)
        .values({
          userId: user.id,
          id: b.id,
          bank: b.bank,
          nickname: b.nickname ?? '',
          type: b.type,
          startingBalance: b.startingBalance,
          dueDate: b.dueDate ?? null,
        })
        .onConflictDoUpdate({
          target: [schema.bankAccounts.userId, schema.bankAccounts.id],
          set: {
            bank: b.bank,
            nickname: b.nickname ?? '',
            type: b.type,
            startingBalance: b.startingBalance,
            dueDate: b.dueDate ?? null,
          },
        })
    }

    for (const a of blob.assets ?? []) {
      await tx
        .insert(schema.assets)
        .values({
          userId: user.id,
          id: a.id,
          name: a.name,
          value: a.value,
          category: a.category,
          creditLimit: a.creditLimit ?? null,
          dueDate: a.dueDate ?? null,
          minimumPayment: a.minimumPayment ?? null,
        })
        .onConflictDoUpdate({
          target: [schema.assets.userId, schema.assets.id],
          set: {
            name: a.name,
            value: a.value,
            category: a.category,
            creditLimit: a.creditLimit ?? null,
            dueDate: a.dueDate ?? null,
            minimumPayment: a.minimumPayment ?? null,
          },
        })
    }

    for (const i of blob.investments ?? []) {
      await tx
        .insert(schema.investments)
        .values({
          userId: user.id,
          id: i.id,
          name: i.name,
          type: i.type,
          amountInvested: i.amountInvested,
          currentValue: i.currentValue,
          symbol: i.symbol ?? null,
          sharesHeld: i.sharesHeld ?? null,
          buyPrice: i.buyPrice ?? null,
          priceOverride: i.priceOverride ?? null,
          lastPriceUpdate: i.lastPriceUpdate ?? null,
        })
        .onConflictDoUpdate({
          target: [schema.investments.userId, schema.investments.id],
          set: {
            name: i.name,
            type: i.type,
            amountInvested: i.amountInvested,
            currentValue: i.currentValue,
            symbol: i.symbol ?? null,
            sharesHeld: i.sharesHeld ?? null,
            buyPrice: i.buyPrice ?? null,
            priceOverride: i.priceOverride ?? null,
            lastPriceUpdate: i.lastPriceUpdate ?? null,
          },
        })
    }

    for (const f of blob.mutualFunds ?? []) {
      await tx
        .insert(schema.mutualFunds)
        .values({
          userId: user.id,
          id: f.id,
          name: f.name,
          fundType: f.fundType,
          unitsHeld: f.unitsHeld,
          buyNav: f.buyNav,
          currentNav: f.currentNav,
          navOverride: f.navOverride,
          lastUpdated: f.lastUpdated,
          realizedGains: f.realizedGains,
          notes: f.notes,
        })
        .onConflictDoUpdate({
          target: [schema.mutualFunds.userId, schema.mutualFunds.id],
          set: {
            name: f.name,
            fundType: f.fundType,
            unitsHeld: f.unitsHeld,
            buyNav: f.buyNav,
            currentNav: f.currentNav,
            navOverride: f.navOverride,
            lastUpdated: f.lastUpdated,
            realizedGains: f.realizedGains,
            notes: f.notes,
          },
        })
    }

    for (const r of blob.recurringIncomes ?? []) {
      await tx
        .insert(schema.recurringIncomes)
        .values({
          userId: user.id,
          id: r.id,
          source: r.source,
          category: r.category,
          amount: r.amount,
          account: r.account,
          frequency: r.frequency,
          nextDate: r.nextDate,
        })
        .onConflictDoUpdate({
          target: [schema.recurringIncomes.userId, schema.recurringIncomes.id],
          set: {
            source: r.source,
            category: r.category,
            amount: r.amount,
            account: r.account,
            frequency: r.frequency,
            nextDate: r.nextDate,
          },
        })
    }

    // incomes last — recurringId/depositedToAccountId get real composite FKs
    // now, so any reference that doesn't resolve to something just migrated
    // above must be nulled out rather than left dangling (the old blob
    // allowed silent dangling references; a real FK constraint would reject
    // the insert outright).
    const recurringIds = new Set((blob.recurringIncomes ?? []).map(r => r.id))
    const bankAccountIds = new Set((blob.bankAccounts ?? []).map(b => b.id))

    for (const i of blob.incomes ?? []) {
      const recurringId = i.recurringId && recurringIds.has(i.recurringId) ? i.recurringId : null
      const depositedToAccountId =
        i.depositedToAccountId && bankAccountIds.has(i.depositedToAccountId) ? i.depositedToAccountId : null

      await tx
        .insert(schema.incomes)
        .values({
          userId: user.id,
          id: i.id,
          source: i.source,
          category: i.category,
          amount: i.amount,
          account: i.account,
          date: i.date,
          recurringId,
          depositedToAccountId,
        })
        .onConflictDoUpdate({
          target: [schema.incomes.userId, schema.incomes.id],
          set: {
            source: i.source,
            category: i.category,
            amount: i.amount,
            account: i.account,
            date: i.date,
            recurringId,
            depositedToAccountId,
          },
        })
    }

    for (const e of blob.expenses ?? []) {
      await tx
        .insert(schema.expenses)
        .values({
          userId: user.id,
          id: e.id,
          description: e.description,
          amount: e.amount,
          category: e.category,
          date: e.date,
          receiptUrl: e.receiptUrl ?? null,
          account: e.account ?? null,
        })
        .onConflictDoUpdate({
          target: [schema.expenses.userId, schema.expenses.id],
          set: {
            description: e.description,
            amount: e.amount,
            category: e.category,
            date: e.date,
            receiptUrl: e.receiptUrl ?? null,
            account: e.account ?? null,
          },
        })
    }

    for (const snap of blob.netWorthHistory ?? []) {
      await tx
        .insert(schema.netWorthSnapshots)
        .values({ userId: user.id, date: snap.date, value: snap.value })
        .onConflictDoUpdate({
          target: [schema.netWorthSnapshots.userId, schema.netWorthSnapshots.date],
          set: { value: snap.value },
        })
    }
  })
}

// Retries transient network failures (observed: intermittent DNS resolution
// failures against the Upstash REST hostname) a few times with backoff
// before giving up — cheap insurance since every operation here is either
// read-only (Redis) or idempotent (Postgres upserts), so a retry can never
// duplicate or corrupt anything, only redo work that didn't happen yet.
async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 4): Promise<T> {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === attempts) throw err
      const delayMs = 1000 * i
      console.warn(`  [retry] ${label} failed (attempt ${i}/${attempts}), retrying in ${delayMs}ms:`, err instanceof Error ? err.message : err)
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  throw new Error('unreachable')
}

async function main() {
  const userKeys = await withRetry(() => redis.keys('user:*'), 'redis.keys(user:*)')
  console.log(`Found ${userKeys.length} user(s) in Redis.`)

  let succeeded = 0
  let failed = 0

  for (const key of userKeys) {
    try {
      await withRetry(() => migrateUser(key), `migrateUser(${key})`)
      succeeded++
      console.log(`  [ok] ${key}`)
    } catch (err) {
      failed++
      console.error(`  [FAIL] ${key}:`, err)
    }
  }

  console.log(`\nDone. ${succeeded} succeeded, ${failed} failed out of ${userKeys.length}.`)
  if (failed > 0) process.exitCode = 1
}

main()
