'use client'

import { useEffect, useState } from 'react'
import { Plug, ShieldOff } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'

interface Grant {
  grantId: string
  clientName: string
  scopes: string[]
}

const SCOPE_LABELS: Record<string, string> = {
  'gramafin:read': 'Read',
  'gramafin:write': 'Write',
}

export default function ConnectedAppsSection() {
  const [grants, setGrants] = useState<Grant[] | null>(null)
  const [error, setError] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<Grant | null>(null)

  function load() {
    fetch('/api/oauth-grants')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('Failed to load connected apps'))))
      .then(data => setGrants(data.grants))
      .catch(err => setError(err.message))
  }

  useEffect(() => {
    load()
  }, [])

  async function revoke(grantId: string) {
    setRevokeTarget(null)
    const prev = grants
    setGrants(g => g?.filter(x => x.grantId !== grantId) ?? null)
    const res = await fetch(`/api/oauth-grants/${grantId}`, { method: 'DELETE' })
    if (!res.ok) {
      setGrants(prev ?? null)
      setError('Failed to disconnect — try again')
    }
  }

  return (
    <div className="card">
      <h2 className="text-sm font-medium text-ink-primary mb-1">Connected apps</h2>
      <p className="text-xs text-ink-muted mb-4">
        AI assistants (like Claude) and other apps you've connected to your Gramafin account via MCP.
      </p>
      {error && <p className="text-xs text-danger mb-3 bg-red-50 dark:bg-danger/10 px-3 py-2 rounded">{error}</p>}

      {grants === null ? (
        <p className="text-sm text-ink-muted text-center py-6">Loading…</p>
      ) : grants.length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-6">No apps connected yet</p>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-white/5">
          {grants.map(g => (
            <div key={g.grantId} className="flex items-center justify-between py-2.5 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center bg-brand-50 text-brand-700">
                  <Plug className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-ink-primary truncate">{g.clientName}</p>
                  <p className="text-[11px] text-ink-muted">
                    {g.scopes.map(s => SCOPE_LABELS[s] || s).join(' · ') || 'No access granted'}
                  </p>
                </div>
              </div>
              <button className="btn-danger flex-shrink-0" onClick={() => setRevokeTarget(g)} aria-label="Disconnect app">
                <ShieldOff className="w-3.5 h-3.5" /> Disconnect
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={revokeTarget !== null}
        title={`Disconnect "${revokeTarget?.clientName}"?`}
        message="It will immediately lose access to your Gramafin account — including any active session it's already connected with. You can reconnect it later if you want to."
        confirmLabel="Disconnect"
        onConfirm={() => revokeTarget && revoke(revokeTarget.grantId)}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  )
}
