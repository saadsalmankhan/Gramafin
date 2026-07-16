import Provider from 'oidc-provider'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { DrizzleAdapter } from '@/db/oidcAdapter'

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const ISSUER = `${APP_URL}/api/oidc`
export const MCP_RESOURCE = `${APP_URL}/api/mcp`

// The authorization server for Gramafin's MCP connector — lets an MCP
// client (Claude, ChatGPT, etc.) obtain a token scoped to one specific
// Gramafin user's account. Runs as its own oidc-provider instance rather
// than piggybacking on NextAuth, since NextAuth is a session-cookie system
// for this app's own frontend, not an OAuth *authorization server* other
// applications can be issued tokens against. The actual sign-in step still
// reuses the existing NextAuth session/login page — see
// pages/api/oidc/interaction/[...path].ts.
function loadKeys() {
  const raw = process.env.OIDC_JWKS
  if (!raw) throw new Error('OIDC_JWKS is not set')
  return JSON.parse(raw)
}

function loadCookieKeys(): string[] {
  const raw = process.env.OIDC_COOKIE_KEYS
  if (!raw) throw new Error('OIDC_COOKIE_KEYS is not set')
  return JSON.parse(raw)
}

export const oidc = new Provider(ISSUER, {
  adapter: DrizzleAdapter,
  jwks: loadKeys(),
  cookies: {
    keys: loadCookieKeys(),
  },
  // Only a real Gramafin account can be the subject of a token — accountId
  // is always a users.id (uuid), resolved during the interaction/login
  // step, never taken from client-supplied input directly.
  async findAccount(_ctx, accountId) {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, accountId)).limit(1)
    if (!user) return undefined
    return {
      accountId: user.id,
      async claims() {
        return { sub: user.id }
      },
    }
  },
  // gramafin:read/gramafin:write have to be declared here too, even though
  // they're already declared as resource-server scopes below via
  // getResourceServerInfo's `scope` field. Two independent oidc-provider
  // checks read from different sources and both must pass:
  //   - DCR's `scope` metadata validation (client_schema.js) checks
  //     requested scope tokens against *this* top-level list — a client
  //     that registers requesting "gramafin:read gramafin:write" (as
  //     Claude's connector does) gets invalid_client_metadata if a scope
  //     isn't recognized here, regardless of getResourceServerInfo.
  //   - The consent screen's "op_scopes_missing" check separately verifies
  //     every scope classified as "OIDC" (i.e. present in this list) was
  //     granted via grant.addOIDCScope() — a completely different call
  //     than addResourceScope(). Declaring a scope here without also
  //     calling addOIDCScope() for it at consent time is exactly what
  //     caused an infinite consent loop before (confirmed the hard way).
  // So both grant.addOIDCScope() and grant.addResourceScope() are called
  // for these scopes now — see pages/api/oidc/interaction/[uid]/confirm.ts.
  scopes: ['gramafin:read', 'gramafin:write'],
  claims: {
    // No standard OIDC identity scopes (profile/email) — MCP clients only
    // need an opaque-to-them subject id, not a login/identity flow, so
    // 'openid' is deliberately not offered. (oidc-provider still lists it
    // in scopes_supported regardless — it's a base OIDC provider under the
    // hood — but findAccount only ever returns a bare `sub`, so requesting
    // it gets a client nothing beyond what gramafin:read already implies.)
  },
  // 'code' only — OAuth 2.1 drops the implicit and hybrid flows entirely;
  // oidc-provider's own default response_types_supported still includes
  // them unless overridden here.
  responseTypes: ['code'],
  // Default oidc-provider behavior only issues a refresh token when the
  // client explicitly requested the 'offline_access' scope (a standard
  // OIDC scope this server deliberately doesn't offer — see `scopes`
  // above). MCP clients have no reason to know about that convention, and
  // Gramafin's own short AccessToken TTL (1 hour, see `ttl` below) makes a
  // refresh token the only way a connection outlives that without forcing
  // the user to reapprove hourly — so it's issued unconditionally instead.
  async issueRefreshToken(_ctx, client) {
    return client.grantTypeAllowed('refresh_token')
  },
  pkce: {
    required: () => true,
  },
  features: {
    // oidc-provider ships a built-in placeholder login/consent UI meant
    // only for local exploration — Gramafin has its own login page and a
    // real consent screen (see the interaction routes), so this must stay
    // off in every environment, not just production.
    devInteractions: { enabled: false },
    registration: {
      // Open (unauthenticated) Dynamic Client Registration — required for
      // "click connect in Claude.ai and it just works" without a manual
      // pre-registration step. This only lets someone register a *client*
      // (an app identity); it never grants access to any user's data by
      // itself — that still requires a real user completing login +
      // consent for that specific client. Matches how DCR is used for
      // every other public-facing MCP server.
      enabled: true,
      initialAccessToken: false,
    },
    revocation: { enabled: true },
    resourceIndicators: {
      enabled: true,
      defaultResource: () => MCP_RESOURCE,
      // Binds every issued access token's `aud` claim to Gramafin's own MCP
      // endpoint and forces the JWT format (self-contained, verifiable by
      // the MCP route without a DB round trip). This is the mechanism the
      // MCP spec relies on to prevent a token issued for one resource
      // server being replayed against another (the "confused deputy"
      // problem) — see MCP_RESOURCE usage in the /api/mcp route.
      getResourceServerInfo(_ctx, resourceIndicator) {
        if (resourceIndicator !== MCP_RESOURCE) {
          throw new Error('invalid_target')
        }
        return {
          scope: 'gramafin:read gramafin:write',
          accessTokenFormat: 'jwt' as const,
          jwt: { sign: { alg: 'RS256' as const } },
        }
      },
    },
  },
  ttl: {
    // Short-lived access tokens, longer-lived refresh tokens — the
    // "least-privilege / minimize blast radius of a leaked token" pattern
    // called out in the MCP authorization guidance.
    AccessToken: 3600, // 1 hour
    RefreshToken: 60 * 60 * 24 * 30, // 30 days
    AuthorizationCode: 60, // 1 minute — only alive long enough for the redirect round trip
    Interaction: 60 * 15, // 15 minutes to complete login/consent
    Session: 60 * 60 * 24 * 30,
    Grant: 60 * 60 * 24 * 30,
  },
  interactions: {
    // oidc-provider scopes the _interaction session cookie's Path to
    // exactly this URL (a deliberate security choice — that cookie has no
    // business being sent anywhere else). That means whatever reads it
    // later (interactionDetails/interactionFinished, both of which need
    // this cookie) has to live at this same path or a sub-path of it —
    // it can't be a separate page fetching a separate API route at a
    // different path, which is why this points at the Pages API route
    // directly (see pages/api/oidc/interaction/[uid].ts) rather than the
    // pretty page a first pass at this put at /oauth/interaction/:uid.
    url(_ctx, interaction) {
      return `/api/oidc/interaction/${interaction.uid}`
    },
  },
  // Every route this provider serves is mounted under /api/oidc (see
  // pages/api/oidc/[...oidc].ts) — these paths are relative to that mount.
  routes: {
    authorization: '/authorize',
    token: '/token',
    registration: '/register',
    revocation: '/revoke',
    jwks: '/jwks',
    userinfo: '/userinfo',
  },
})

// Vercel's proxy terminates TLS in front of the function — without this,
// oidc-provider would build http:// URLs (issuer mismatch, cookie
// Secure-flag mismatch) since it can't otherwise tell the original request
// was HTTPS.
oidc.proxy = true
