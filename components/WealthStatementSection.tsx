'use client'

import { useState } from 'react'
import { FileDown, Mail, Loader2, FileText } from 'lucide-react'
import { today } from '@/lib/utils'

function lastMonths(n: number): string[] {
  const out: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 7))
    d.setMonth(d.getMonth() - 1)
  }
  return out
}

function monthLabel(m: string) {
  return new Date(`${m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function WealthStatementSection() {
  const [month, setMonth] = useState(today().slice(0, 7))
  const [busy, setBusy] = useState<'download' | 'email' | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setBusy('download')
    setError('')
    try {
      const res = await fetch(`/api/export/wealth-statement?month=${month}&deliver=download`)
      if (!res.ok) throw new Error('Failed to generate statement')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Gramafin Wealth Statement - ${monthLabel(month)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to generate statement — try again')
    } finally {
      setBusy(null)
    }
  }

  async function emailCopy() {
    setBusy('email')
    setError('')
    setEmailSent(false)
    try {
      const res = await fetch(`/api/export/wealth-statement?month=${month}&deliver=email`)
      if (!res.ok) throw new Error('Failed to send statement')
      setEmailSent(true)
      setTimeout(() => setEmailSent(false), 4000)
    } catch {
      setError('Failed to email statement — try again')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-brand-600" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-ink-primary">Wealth statement</h2>
          <p className="text-xs text-ink-muted">A full PDF snapshot of your net worth, accounts, investments, and activity for one month.</p>
        </div>
      </div>

      {error && <p className="text-xs text-danger mt-3 bg-red-50 dark:bg-danger/10 px-3 py-2 rounded">{error}</p>}
      {emailSent && <p className="text-xs text-success mt-3 bg-green-50 dark:bg-success/10 px-3 py-2 rounded">Sent! Check your inbox.</p>}

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <select className="select flex-1 min-w-[160px]" value={month} onChange={e => setMonth(e.target.value)}>
          {lastMonths(24).map(m => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        <button className="btn-primary" onClick={download} disabled={busy !== null}>
          {busy === 'download' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
          {busy === 'download' ? 'Generating…' : 'Download PDF'}
        </button>
        <button className="btn-ghost" onClick={emailCopy} disabled={busy !== null}>
          {busy === 'email' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
          {busy === 'email' ? 'Sending…' : 'Email me a copy'}
        </button>
      </div>
    </div>
  )
}
