import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PortableText, PortableTextComponents } from '@portabletext/react'
import { ArrowLeft } from 'lucide-react'
import { getHelpArticleBySlug, categoryLabel } from '@/lib/sanity/queries'

export const revalidate = 60

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => <h2 className="text-lg font-semibold text-ink-primary mt-8 mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-medium text-ink-primary mt-6 mb-2">{children}</h3>,
    normal: ({ children }) => <p className="text-sm text-ink-secondary leading-relaxed mb-4">{children}</p>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-brand-200 pl-4 text-sm text-ink-muted italic mb-4">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc pl-5 text-sm text-ink-secondary mb-4 space-y-1">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal pl-5 text-sm text-ink-secondary mb-4 space-y-1">{children}</ol>,
  },
  marks: {
    link: ({ children, value }) => (
      <a href={value?.href} className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    strong: ({ children }) => <strong className="font-semibold text-ink-primary">{children}</strong>,
  },
}

export default async function HelpArticlePage({ params }: { params: { slug: string } }) {
  const article = await getHelpArticleBySlug(params.slug)
  if (!article) notFound()

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/help" className="text-xs text-ink-muted hover:text-ink-primary flex items-center gap-1 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Help Center
      </Link>

      <p className="section-label mb-2">{categoryLabel(article.category)}</p>
      <h1 className="text-2xl sm:text-3xl font-semibold text-ink-primary tracking-tight mb-8">{article.title}</h1>

      <PortableText value={article.body} components={components} />
    </div>
  )
}
