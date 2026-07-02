import { redis } from '@/lib/redis'
import { AppState } from '@/types'

function dataKey(userId: string): string {
  return `data:${userId}`
}

export async function getUserData(userId: string): Promise<AppState | null> {
  return redis.get<AppState>(dataKey(userId))
}

export async function saveUserData(userId: string, data: AppState): Promise<void> {
  await redis.set(dataKey(userId), data)
}
