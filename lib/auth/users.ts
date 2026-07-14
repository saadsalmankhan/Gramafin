import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { DEFAULT_BUDGETS, EXPENSE_CATEGORIES } from '@/types'

export interface StoredUser {
  id: string
  email: string
  name: string
  passwordHash: string
  emailVerified: boolean
  createdAt: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizeEmail(email)))
    .limit(1)
  return user ?? null
}

export async function createUser(params: {
  email: string
  password: string
  name: string
}): Promise<StoredUser> {
  const { email, password, name } = params
  const existing = await getUserByEmail(email)
  if (existing) {
    throw new Error('An account with this email already exists')
  }

  try {
    const [user] = await db
      .insert(schema.users)
      .values({
        email: normalizeEmail(email),
        name: name.trim(),
        passwordHash: await bcrypt.hash(password, 12),
        emailVerified: false,
      })
      .returning()

    // New users start with no rows anywhere else — seed the 8 fixed budget
    // categories and default preferences so every downstream read (bootstrap,
    // budget page) can rely on a row existing per category instead of having
    // to synthesize defaults for a user who technically has zero rows yet.
    await db.insert(schema.preferences).values({ userId: user.id })
    await db.insert(schema.budgetLimits).values(
      EXPENSE_CATEGORIES.map((category) => ({
        userId: user.id,
        category,
        amount: DEFAULT_BUDGETS[category],
      }))
    )

    return user
  } catch (err: unknown) {
    // Unique-violation race: two signups for the same email landing between
    // the check above and this insert. Redis's get-then-set had this same
    // race with no protection at all; the DB's unique constraint now catches
    // it for real, so surface the same user-facing message instead of a raw
    // constraint error.
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new Error('An account with this email already exists')
    }
    throw err
  }
}

export async function markEmailVerified(email: string): Promise<void> {
  await db
    .update(schema.users)
    .set({ emailVerified: true })
    .where(eq(schema.users.email, normalizeEmail(email)))
}

export async function updateUserPassword(email: string, newPassword: string): Promise<void> {
  // Resetting via a mailed link proves email ownership just as well as the
  // original verification link would have, so clear up any unverified state.
  await db
    .update(schema.users)
    .set({
      passwordHash: await bcrypt.hash(newPassword, 12),
      emailVerified: true,
    })
    .where(eq(schema.users.email, normalizeEmail(email)))
}

export async function verifyPassword(user: StoredUser, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash)
}
