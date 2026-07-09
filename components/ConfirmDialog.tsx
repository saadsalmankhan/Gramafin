'use client'

import { useEffect } from 'react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
    >
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-medium text-ink-primary mb-2">{title}</h2>
        <p className="text-sm text-ink-secondary leading-relaxed mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="h-9 px-4 rounded bg-danger text-white text-sm font-medium hover:bg-red-700 active:scale-[.98] transition-all duration-100"
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
