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
  await oidc.callback()(req, res)
}
