'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import TourHighlight from '@/components/TourHighlight'
import { Copy, Check, Send, Gift } from 'lucide-react'

const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

interface InviteRow {
  email: string
  invitedAt: string
  acceptedAt: string | null
}

export default function ReferralsSection() {
  const { state, sendReferralInvite } = useStore()
  const { code, sentCount, acceptedCount, points } = state.referrals
  const referralUrl = code ? `${APP_URL}/signup?ref=${code}` : ''

  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [invites, setInvites] = useState<InviteRow[] | null>(null)

  useEffect(() => {
    fetch('/api/referrals')
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => setInvites(data.invites))
      .catch(() => setInvites([]))
  }, [sentCount])

  function copyLink() {
    if (!referralUrl) return
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function invite() {
    if (!email.trim()) return
    setSending(true)
    setError('')
    setSent(false)
    try {
      await sendReferralInvite(email.trim())
      setEmail('')
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Gift className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold font-mono text-ink-primary">{points.toLocaleString('en-PK')} points</p>
            <p className="text-xs text-ink-muted">
              {sentCount} invite{sentCount === 1 ? '' : 's'} sent · {acceptedCount} joined
            </p>
          </div>
        </div>
        <p className="text-[11px] text-ink-muted mt-3">
          Earn 10 points for every friend you invite, and 200 more once they sign up. Redeemable at the Gramafin
          merch shop — coming soon.
        </p>
      </div>

      <div className="card">
        <h2 className="text-sm font-medium text-ink-primary mb-1">Your referral link</h2>
        <p className="text-xs text-ink-muted mb-3">Share this — anyone who signs up through it counts as your referral.</p>
        <div className="flex gap-2">
          <input className="input flex-1 font-mono text-xs" readOnly value={referralUrl} onFocus={e => e.target.select()} />
          <button className="btn-ghost" onClick={copyLink}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <TourHighlight label="Invite a friend here">
        <div className="card">
          <h2 className="text-sm font-medium text-ink-primary mb-1">Invite by email</h2>
          <p className="text-xs text-ink-muted mb-3">We&apos;ll send them a link to join — you earn 10 points right away.</p>
          {error && <p className="text-xs text-danger mb-3 bg-red-50 dark:bg-danger/10 px-3 py-2 rounded">{error}</p>}
          {sent && <p className="text-xs text-success mb-3 bg-green-50 dark:bg-success/10 px-3 py-2 rounded">Invite sent!</p>}
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && invite()}
            />
            <button className="btn-primary" onClick={invite} disabled={sending || !email.trim()}>
              <Send className="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </div>
      </TourHighlight>

      <div className="card">
        <h2 className="text-sm font-medium text-ink-primary mb-4">
          Invites sent
          {invites && <span className="ml-2 text-ink-muted font-normal">({invites.length})</span>}
        </h2>
        {invites === null ? (
          <p className="text-sm text-ink-muted text-center py-6">Loading…</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-6">No invites sent yet</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {invites.map(inv => (
              <div key={inv.email} className="flex items-center justify-between py-2.5">
                <p className="text-sm text-ink-primary truncate">{inv.email}</p>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                    inv.acceptedAt ? 'bg-green-50 text-success dark:bg-success/10' : 'bg-gray-50 text-ink-muted dark:bg-white/5'
                  }`}
                >
                  {inv.acceptedAt ? 'Joined' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
