import type { NextApiRequest, NextApiResponse } from 'next'
import { oidc, MCP_RESOURCE } from '@/lib/oidc/provider'
import { getGramafinUserId } from '@/lib/oidc/pagesSession'
import type { InteractionResults } from 'oidc-provider'

// Approves the pending authorization request. Submits both login and
// consent results every time — by the time this route is reachable the
// visitor has already proven they're logged into Gramafin (the interaction
// page redirects to /login otherwise), so there's no separate "now do the
// login step" to withhold. oidc-provider still resolves the two prompts
// across two round trips regardless (login first, then a fresh interaction
// for consent) — each redirects back through this same consent screen, so
// in practice this means one extra silent click-through rather than a
// second distinct screen.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const gramafinUserId = await getGramafinUserId(req, res)
  if (!gramafinUserId) {
    res.status(401).json({ error: 'Not logged into Gramafin' })
    return
  }

  let details
  try {
    details = await oidc.interactionDetails(req, res)
  } catch (err) {
    console.error('confirm: interactionDetails failed:', err)
    res.status(400).json({ error: 'Invalid or expired authorization request' })
    return
  }

  const clientId = typeof details.params.client_id === 'string' ? details.params.client_id : undefined
  const scope = typeof details.params.scope === 'string' ? details.params.scope : ''
  const resource = typeof details.params.resource === 'string' ? details.params.resource : MCP_RESOURCE
  if (!clientId) {
    res.status(400).json({ error: 'Missing client_id' })
    return
  }

  try {
    const grant = details.grantId
      ? await oidc.Grant.find(details.grantId)
      : new oidc.Grant({ accountId: gramafinUserId, clientId })
    if (!grant) {
      res.status(400).json({ error: 'Grant not found' })
      return
    }
    grant.addResourceScope(resource, scope)
    const grantId = await grant.save()

    const result: InteractionResults = {
      login: { accountId: gramafinUserId },
      consent: { grantId },
    }

    await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: true })
  } catch (err) {
    console.error('confirm: grant/interactionFinished failed:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to complete authorization' })
    }
  }
}
