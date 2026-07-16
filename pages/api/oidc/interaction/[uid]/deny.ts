import type { NextApiRequest, NextApiResponse } from 'next'
import { oidc } from '@/lib/oidc/provider'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  await oidc.interactionFinished(
    req,
    res,
    { error: 'access_denied', error_description: 'User denied access' },
    { mergeWithLastSubmission: false }
  )
}
