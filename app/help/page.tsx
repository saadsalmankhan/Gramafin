import Link from 'next/link'
import Image from 'next/image'
import { Rocket, Receipt, Building2, TrendingUp, Settings, ArrowRight, LucideIcon } from 'lucide-react'
import { getAllHelpArticles, categoryLabel, HelpArticleSummary } from '@/lib/sanity/queries'
import { urlForImage } from '@/lib/sanity/image'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'getting-started': Rocket,
  'expenses-budgets': Receipt,
  'net-worth': Building2,
  investments: TrendingUp,
  account: Settings,
}

const CATEGORY_ORDER = ['getting-started', 'expenses-budgets', 'net-worth', 'investments', 'account']

export const revalidate = 60

export default async function HelpIndexPage() {
  const articles = await getAllHelpArticles()

  const grouped = new Map<string, HelpArticleSummary[]>()
  for (const article of articles) {
    const list = grouped.get(article.category) ?? []
    list.push(article)
    grouped.set(article.category, list)
  }
  const categories = Array.from(grouped.keys()).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-semibold text-ink-primary tracking-tight">Help Center</h1>
        <p className="text-sm text-ink-muted mt-3">Answers to common questions about using Gramafin.</p>
      </div>

      {articles.length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-12">No articles published yet.</p>
      ) : (
        <div className="space-y-10">
          {categories.map(category => {
            const Icon = CATEGORY_ICONS[category] ?? Rocket
            return (
              <section key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-brand-600" />
                  </div>
                  <h2 className="text-sm font-medium text-ink-primary">{categoryLabel(category)}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grouped.get(category)!.map(article => (
                    <Link
                      key={article._id}
                      href={`/help/${article.slug}`}
                      className="card hover:border-brand-200 transition-colors overflow-hidden p-0"
                    >
                      {article.mainImage && (
                        <div className="relative w-full h-28 bg-surface-1">
                          <Image
                            src={urlForImage(article.mainImage.asset).width(600).height(280).fit('crop').url()}
                            alt={article.mainImage.alt}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="text-sm font-medium text-ink-primary mb-1.5 flex items-center gap-1.5">
                          {article.title}
                          <ArrowRight className="w-3.5 h-3.5 text-ink-muted" />
                        </h3>
                        <p className="text-xs text-ink-muted leading-relaxed">{article.excerpt}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
