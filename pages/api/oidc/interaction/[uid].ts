import type { NextApiRequest, NextApiResponse } from 'next'
import { oidc } from '@/lib/oidc/provider'
import { getGramafinUserId } from '@/lib/oidc/pagesSession'

// oidc-provider scopes the _interaction cookie's Path to exactly the URL
// configured in interactions.url() (see lib/oidc/provider.ts) — this route
// IS that URL, so this is the only place that can read it. That's also why
// this renders the consent screen directly as HTML rather than being a
// JSON endpoint a separate React page fetches: a fetch() from any other
// path wouldn't carry the cookie, and interactionDetails/interactionFinished
// both need it (plus the raw req/res only the Pages Router provides).
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const SCOPE_LABELS: Record<string, string> = {
  'gramafin:read': 'View your net worth, expenses, and budgets',
  'gramafin:write': 'Add or delete expenses, and change budgets',
}

function renderPage(opts: { uid: string; clientName: string; scopes: string[]; error?: string }) {
  const { uid, clientName, scopes, error } = opts
  const items = scopes
    .map(s => SCOPE_LABELS[s])
    .filter(Boolean)
    .map(label => `<li>${escapeHtml(label)}</li>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Connect ${escapeHtml(clientName)} — Gramafin</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: rgb(248 247 244); color: rgb(15 15 14);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 24px;
  }
  .card {
    width: 100%; max-width: 380px; background: #fff; border: 1px solid rgb(228 225 216);
    border-radius: 12px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .brand { text-align: center; font-weight: 700; font-size: 18px; margin-bottom: 24px; }
  .brand span { color: rgb(0 128 55); }
  h1 { font-size: 17px; font-weight: 600; margin: 0 0 4px; }
  p.sub { font-size: 14px; color: rgb(74 73 69); margin: 0 0 20px; line-height: 1.5; }
  ul { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-direction: column; gap: 10px; }
  li { font-size: 14px; padding-left: 22px; position: relative; }
  li::before { content: '✓'; position: absolute; left: 0; color: rgb(0 128 55); font-weight: 700; }
  .row { display: flex; gap: 10px; }
  button {
    flex: 1; height: 40px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;
    border: 1px solid rgb(228 225 216);
  }
  button.primary { background: rgb(0 128 55); color: #fff; border-color: rgb(0 128 55); }
  button.ghost { background: #fff; color: rgb(15 15 14); }
  button:disabled { opacity: 0.6; cursor: default; }
  p.foot { font-size: 11px; color: rgb(138 136 128); text-align: center; margin: 18px 0 0; }
  p.error { font-size: 13px; color: rgb(200 40 40); background: rgb(253 235 235); padding: 10px 12px; border-radius: 6px; margin: 0 0 16px; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">gf <span>Gramafin</span></div>
    <h1>Connect ${escapeHtml(clientName)}</h1>
    <p class="sub">${escapeHtml(clientName)} wants to access your Gramafin account. This will be able to:</p>
    ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
    <ul>${items}</ul>
    <div class="row">
      <button class="ghost" id="deny">Deny</button>
      <button class="primary" id="allow">Allow access</button>
    </div>
    <p class="foot">You can revoke this at any time from Settings.</p>
  </div>
  <script>
    // oidc-provider resolves the login and consent prompts as two separate
    // round trips (this page's own submission satisfies login; the
    // redirect it returns lands on a *new* interaction, at this same URL
    // shape, still needing consent) — chase that chain here so the visitor
    // only has to click once instead of seeing this same screen twice.
    async function respond(action, path, depth) {
      depth = depth || 0
      document.getElementById('allow').disabled = true
      document.getElementById('deny').disabled = true
      try {
        const res = await fetch(path + '/' + action, { method: 'POST' })
        if (!res.redirected) { window.location.reload(); return }
        if (action === 'confirm' && depth < 5 && /\\/api\\/oidc\\/interaction\\//.test(res.url)) {
          const nextPath = new URL(res.url).pathname
          await respond('confirm', nextPath, depth + 1)
          return
        }
        window.location.href = res.url
      } catch (e) {
        window.location.reload()
      }
    }
    document.getElementById('allow').addEventListener('click', () => respond('confirm', '/api/oidc/interaction/${uid}'))
    document.getElementById('deny').addEventListener('click', () => respond('deny', '/api/oidc/interaction/${uid}'))
  </script>
</body>
</html>`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).end('Method not allowed')
    return
  }

  let details
  try {
    details = await oidc.interactionDetails(req, res)
  } catch (err) {
    console.error('interactionDetails failed:', err)
    res.status(400).send('This connection request is invalid or has expired.')
    return
  }

  const gramafinUserId = await getGramafinUserId(req, res)
  if (!gramafinUserId) {
    const callbackUrl = encodeURIComponent(`/api/oidc/interaction/${details.uid}`)
    res.writeHead(302, { Location: `/login?callbackUrl=${callbackUrl}` })
    res.end()
    return
  }

  const clientId = typeof details.params.client_id === 'string' ? details.params.client_id : undefined
  const client = clientId ? await oidc.Client.find(clientId) : undefined
  const scope = typeof details.params.scope === 'string' ? details.params.scope : ''

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(
    renderPage({
      uid: details.uid,
      clientName: client?.clientName || clientId || 'An application',
      scopes: scope.split(' ').filter(Boolean),
    })
  )
}
