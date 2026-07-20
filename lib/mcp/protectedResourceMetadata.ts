import { generateProtectedResourceMetadata } from 'mcp-handler'
import { MCP_RESOURCE } from '@/lib/oidc/provider'

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

// RFC 9728 — tells an MCP client (given the WWW-Authenticate header a 401
// from /api/mcp points here) which authorization server issues tokens for
// this resource. This is the discovery step every OAuth-aware MCP client
// does before attempting Dynamic Client Registration. resourceUrl must be
// the *exact* string oidc-provider binds into an issued token's `aud`
// claim (MCP_RESOURCE) — left to auto-derive from the request, this
// defaults to the bare origin ("http://localhost:3000") rather than
// ".../api/mcp", which would silently mismatch the audience verifyToken
// checks in lib/mcp/verifyToken.ts.
//
// scopes_supported is set explicitly here (not read from oidc-provider's
// own discovery document) because gramafin:read/gramafin:write are
// declared as resource-server scopes there, not top-level OIDC scopes —
// see the long comment in lib/oidc/provider.ts for why they can't be
// both. This is the document an MCP client actually reads before deciding
// what to request, so it needs to be accurate regardless.
export const protectedResourceMetadata = generateProtectedResourceMetadata({
  authServerUrls: [`${APP_URL}/api/oidc`],
  resourceUrl: MCP_RESOURCE,
  additionalMetadata: { scopes_supported: ['gramafin:read', 'gramafin:write'] },
})
