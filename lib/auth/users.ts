import bcrypt from 'bcryptjs'
import { redis } from '@/lib/redis'

export interface StoredUser {
  id: string
  email: string
  name: string
  passwordHash: string
  emailVerified: boolean
  createdAt: string
}

function userKey(email: string): string {
  return `user:${email.trim().toLowerCase()}`
}

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  return redis.get<StoredUser>(userKey(email))
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

  const user: StoredUser = {
    id: crypto.randomUUID(),
    email: email.trim().toLowerCase(),
    name: name.trim(),
    passwordHash: await bcrypt.hash(password, 10),
    emailVerified: false,
    createdAt: new Date().toISOString(),
  }

  await redis.set(userKey(user.email), user)
  return user
}

export async function markEmailVerified(email: string): Promise<void> {
  const user = await getUserByEmail(email)
  if (!user) return
  user.emailVerified = true
  await redis.set(userKey(user.email), user)
}

export async function updateUserPassword(email: string, newPassword: string): Promise<void> {
  const user = await getUserByEmail(email)
  if (!user) return
  user.passwordHash = await bcrypt.hash(newPassword, 10)
  // Resetting via a mailed link proves email ownership just as well as the
  // original verification link would have, so clear up any unverified state.
  user.emailVerified = true
  await redis.set(userKey(user.email), user)
}

export async function verifyPassword(user: StoredUser, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash)
}
