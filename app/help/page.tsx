import Link from 'next/link'
import Image from 'next/image'
import { Rocket, ArrowRight } from 'lucide-react'
import { getAllHelpArticles, categoryLabel, HelpArticleSummary } from '@/lib/sanity/queries'
import { urlForImage } from '@/lib/sanity/image'
import { HELP_CATEGORIES } from '@/lib/helpCategories'

export const revalidate = 60

function ArticleCard({ article }: { article: HelpArticleSummary }) {
  return (
    <Link
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
  )
}

export default async function HelpIndexPage({ searchParams }: { searchParams: { category?: string } }) {
  const articles = await getAllHelpArticles()
  const selected = HELP_CATEGORIES.find(c => c.id === searchParams.category) ?? null

  const grouped = new Map<string, HelpArticleSummary[]>()
  for (const article of articles) {
    const list = grouped.get(article.category) ?? []
    list.push(article)
    grouped.set(article.category, list)
  }

  return (
    <div className="max-w-3xl px-6 py-16">
      <div className="mb-12">
        <h1 className="font-sans font-semibold text-3xl sm:text-4xl text-ink-primary tracking-tight">Help Center</h1>
        <p className="text-sm text-ink-muted mt-3">Answers to common questions about using Gramafin.</p>
      </div>

      {articles.length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-12">No articles published yet.</p>
      ) : selected ? (
        (() => {
          const inCategory = grouped.get(selected.id) ?? []
          const Icon = selected.icon
          return (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-brand-600" />
                </div>
                <h2 className="text-sm font-medium text-ink-primary">{selected.label}</h2>
              </div>
              {inCategory.length === 0 ? (
                <p className="text-sm text-ink-muted py-12">No articles in this category yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inCategory.map(article => (
                    <ArticleCard key={article._id} article={article} />
                  ))}
                </div>
              )}
            </section>
          )
        })()
      ) : (
        <div className="space-y-10">
          {HELP_CATEGORIES.filter(c => grouped.has(c.id)).map(category => {
            const Icon = category.icon ?? Rocket
            return (
              <section key={category.id}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-brand-600" />
                  </div>
                  <h2 className="text-sm font-medium text-ink-primary">{categoryLabel(category.id)}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grouped.get(category.id)!.map(article => (
                    <ArticleCard key={article._id} article={article} />
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
