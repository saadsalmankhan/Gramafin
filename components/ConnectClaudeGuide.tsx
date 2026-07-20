'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Copy, Check, ExternalLink, ChevronDown } from 'lucide-react'

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://app.gramafin.com'
const MCP_URL = `${APP_URL}/api/mcp`

const STEPS = [
  {
    title: 'Copy your Gramafin connector URL',
    body: "It's the address Claude uses to talk to your Gramafin account — shown below.",
  },
  {
    title: 'Open Claude and add a custom connector',
    body: 'In Claude, go to Settings → Connectors → Add custom connector, and paste the URL in.',
  },
  {
    title: 'Log in and approve access',
    body: "Claude sends you to Gramafin to sign in (if you aren't already) and asks you to approve what it can see and do.",
    image: true,
  },
  {
    title: "You're connected",
    body: 'Claude can now answer questions about your finances and, if you allowed write access, log expenses or update budgets when you ask it to. It only shows up here — Gramafin never posts anything on its own.',
  },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What can Claude actually see and do?',
    a: 'Exactly what you approve on the consent screen — no more. Read access lets it view your net worth, expenses, and budgets. Write access additionally lets it add or delete expenses and change budgets. It has no access to your bank accounts, investments, income, or liabilities beyond what feeds into net worth, and it can never change your password or account settings.',
  },
  {
    q: 'Is my financial data safe?',
    a: "Yes. The connection uses OAuth, the same standard banks and payment apps use — Gramafin never shares your password with Claude, and Claude never sees your login credentials. You can revoke access instantly at any time from this page, which immediately cuts off Claude's access, including any conversation already in progress.",
  },
  {
    q: 'Can I limit it to read-only?',
    a: 'Yes — the consent screen shows exactly which permissions are being requested before you approve anything. If you only want Claude to view your data and never make changes, deny the request and reconnect, choosing read-only access if your client offers that choice.',
  },
  {
    q: 'Does this work with apps other than Claude?',
    a: "Yes. Gramafin's connector speaks the Model Context Protocol (MCP), an open standard — any MCP-compatible client can connect the same way, using the same URL and OAuth flow.",
  },
  {
    q: "Why doesn't a Gramafin logo show up next to the connector?",
    a: "Some clients cache connector branding the first time they see a URL, so a fresh connection may briefly show a generic icon before the logo appears. This is cosmetic and doesn't affect what the connection can do.",
  },
  {
    q: "It's not connecting — what should I check?",
    a: "Double check you pasted the full URL exactly as shown below, including https://. If Claude shows an error during login, make sure you're signed in to the right Gramafin account first, then try adding the connector again.",
  },
]

interface Props {
  onClose: () => void
}

export default function ConnectClaudeGuide({ onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  function copyUrl() {
    navigator.clipboard.writeText(MCP_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="card w-full max-w-lg max-h-[85vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-ink-muted hover:text-ink-primary transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-base font-semibold text-ink-primary mb-1">Connect Gramafin to Claude</h2>
        <p className="text-sm text-ink-secondary leading-relaxed mb-5">
          Link your account so Claude can answer questions about your finances or make changes on your behalf —
          only with your explicit approval.
        </p>

        <div className="mb-6">
          <p className="text-xs font-medium text-ink-muted mb-1.5">Connector URL</p>
          <div className="flex gap-2">
            <input className="input flex-1 font-mono text-xs" readOnly value={MCP_URL} onFocus={e => e.target.select()} />
            <button className="btn-ghost flex-shrink-0" onClick={copyUrl}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="space-y-5 mb-6">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-primary">{step.title}</p>
                <p className="text-xs text-ink-muted leading-relaxed mt-0.5">{step.body}</p>
                {step.image && (
                  <div className="mt-3 rounded-lg border border-gray-100 dark:border-white/10 overflow-hidden max-w-xs">
                    <Image
                      src="/help/connect-claude-consent.png"
                      alt="Gramafin's consent screen asking you to approve Claude's access"
                      width={760}
                      height={654}
                      className="w-full h-auto"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <a
          href="https://claude.ai/settings/connectors"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full justify-center mb-6"
        >
          Open Claude connector settings <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <div className="border-t border-gray-100 dark:border-white/10 pt-4">
          <p className="text-xs font-medium text-ink-muted mb-2">Frequently asked questions</p>
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {FAQS.map((faq, i) => {
              const open = openFaq === i
              return (
                <div key={i}>
                  <button
                    className="w-full flex items-center justify-between gap-3 py-2.5 text-left"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span className="text-sm text-ink-primary">{faq.q}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-ink-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {open && <p className="text-xs text-ink-muted leading-relaxed pb-3">{faq.a}</p>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
