import { redis } from '@/lib/redis'
import { MufapFund } from '@/lib/mufapScraper'

const CACHE_KEY = 'mufap:funds'

export interface MufapCache {
  funds: MufapFund[]
  updatedAt: string
}

export async function getMufapCache(): Promise<MufapCache | null> {
  return redis.get<MufapCache>(CACHE_KEY)
}

export async function setMufapCache(funds: MufapFund[]): Promise<MufapCache> {
  const cache: MufapCache = { funds, updatedAt: new Date().toISOString() }
  await redis.set(CACHE_KEY, cache)
  return cache
}
