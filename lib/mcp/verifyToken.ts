import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { MCP_RESOURCE } from '@/lib/oidc/provider'

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const ISSUER = `${APP_URL}/api/oidc`

// Access tokens are self-contained JWTs signed by our own oidc-provider
// instance (see accessTokenFormat: 'jwt' in lib/oidc/provider.ts), verified
// here purely by signature + claims — no DB round trip needed. Audience is
// checked explicitly against MCP_RESOURCE: this is the specific check that
// stops a token issued for some other resource server from being replayed
// against this one (the MCP spec's "confused deputy" concern).
//
// Verifies against oidc-provider's own published /jwks endpoint rather
// than OIDC_JWKS directly — that env var holds the *private* signing key
// (oidc-provider needs it to sign), and jose's createLocalJWKSet correctly
// refuses to accept a JWKS containing private key material for
// verification purposes. Fetching the public half from /jwks is the
// standard pattern (jose caches the result, so this isn't a per-request
// network call) and matches exactly what any other resource server
// verifying tokens from this same issuer would have to do.
const jwks = createRemoteJWKSet(new URL(`${ISSUER}/jwks`))

export interface McpAuthInfo extends AuthInfo {
  extra: { userId: string }
}

export async function verifyToken(_req: Request, bearerToken?: string): Promise<McpAuthInfo | undefined> {
  if (!bearerToken) return undefined

  try {
    const { payload } = await jwtVerify(bearerToken, jwks, {
      issuer: ISSUER,
      audience: MCP_RESOURCE,
    })
    if (typeof payload.sub !== 'string') return undefined

    const scope = typeof payload.scope === 'string' ? payload.scope : ''
    return {
      token: bearerToken,
      clientId: typeof payload.client_id === 'string' ? payload.client_id : 'unknown',
      scopes: scope.split(' ').filter(Boolean),
      expiresAt: payload.exp,
      extra: { userId: payload.sub },
    }
  } catch (err) {
    console.error('verifyToken failed:', err)
    return undefined
  }
}
