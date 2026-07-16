import type { NextApiRequest, NextApiResponse } from 'next'
import { oidc } from '@/lib/oidc/provider'

// oidc-provider is a Koa app exposing a plain Node.js (req, res) => void
// callback — it does its own internal routing (/authorize, /token,
// /register, /jwks, etc.) relative to wherever this is mounted, and needs
// raw Node request/response objects (it parses bodies, sets cookies, and
// writes responses itself). Next.js App Router route handlers only expose
// the Web-standard Request/Response, not raw req/res, so this has to live
// in the Pages Router instead — the one place in this app that isn't App
// Router, and exists solely for this reason.
export const config = {
  api: {
    bodyParser: false,
  },
}

// oidc-provider's internal Koa router matches every route (/token,
// /authorize, /.well-known/openid-configuration, etc.) as an *absolute*
// path — Koa's own .callback() has no concept of "mounted under a prefix",
// so it matches directly against req.url. Since this file is reached at
// /api/oidc/*, that prefix has to be stripped before delegating, or every
// route inside oidc-provider 404s.
const MOUNT_PREFIX = '/api/oidc'

// oidc-provider wires up CORS (including the OPTIONS preflight route) for
// most endpoints — token, jwks, userinfo, discovery, revocation, etc. — but
// deliberately not for /register: Dynamic Client Registration (RFC 7591) is
// written assuming the caller is a server, not browser JS. Claude's web app
// calls it directly from the browser, so without CORS here every attempt
// fails silently (preflight 404s, and even the POSTs that do succeed can't
// be read by the caller since the response also lacks
// Access-Control-Allow-Origin) — confirmed via production logs showing the
// OPTIONS preflight 404ing right before Claude's connector setup gave up.
function applyRegistrationCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin
  if (!origin) return
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.url?.startsWith(MOUNT_PREFIX)) {
    // oidc-provider derives the mount path it prepends onto every URL it
    // *generates* (authorization_endpoint, token_endpoint, redirects, ...)
    // by diffing req.originalUrl against the (post-strip) req.url — an
    // Express convention Node's raw IncomingMessage doesn't set on its own.
    // Skipping this doesn't break routing (matching below still works) but
    // silently produces metadata URLs missing the /api/oidc prefix, which
    // is invisible until a real client tries to follow one.
    ;(req as NextApiRequest & { originalUrl?: string }).originalUrl = req.url
    req.url = req.url.slice(MOUNT_PREFIX.length) || '/'
  }

  if (req.url === '/register' || req.url?.startsWith('/register/')) {
    applyRegistrationCors(req, res)
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }
  }

  await oidc.callback()(req, res)
}
