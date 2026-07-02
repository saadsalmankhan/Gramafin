import { LucideIcon } from 'lucide-react'
import Image from 'next/image'

interface Item {
  icon: LucideIcon
  title: string
  desc: string
}

interface Props {
  heading: string
  subheading: string
  items: Item[]
  bars: number[]
}

export default function AuthMarketingPanel({ heading, subheading, items, bars }: Props) {
  return (
    <div className="hidden lg:flex flex-col justify-center bg-surface-0 px-16 py-12 relative overflow-hidden border-r border-gray-100">
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-brand-100 to-brand-200 rounded-full blur-3xl opacity-60" />
      <div className="relative max-w-md">
        <Image src="/logo-mark.png" alt="Gramafin" width={314} height={295} className="w-9 h-auto mb-8" />

        <h2 className="text-2xl font-semibold text-ink-primary mb-2 tracking-tight">{heading}</h2>
        <p className="text-sm text-ink-muted mb-8">{subheading}</p>

        <div className="space-y-5 mb-8">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-primary">{title}</p>
                <p className="text-xs text-ink-muted mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <p className="section-label mb-3">This month</p>
          <div className="flex items-end gap-1.5 h-20">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-brand-700 to-brand-500 opacity-80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
