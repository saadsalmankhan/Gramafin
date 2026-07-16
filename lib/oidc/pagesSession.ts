import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/options'

// getServerSession's App Router overload (used by lib/api-auth.ts) reads
// cookies via next/headers, which doesn't exist in the Pages Router — this
// is the same call with the (req, res) overload Pages API routes need.
export async function getGramafinUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const session = await getServerSession(req, res, authOptions)
  return session?.user?.id ?? null
}
