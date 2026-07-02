import { client } from './client'

export interface HelpArticleSummary {
  _id: string
  title: string
  slug: string
  category: string
  excerpt: string
  publishedAt: string
}

export interface HelpArticle extends HelpArticleSummary {
  body: unknown
}

const CATEGORY_LABELS: Record<string, string> = {
  'getting-started': 'Getting started',
  'expenses-budgets': 'Expenses & budgets',
  'net-worth': 'Net worth & credit cards',
  investments: 'Investments & mutual funds',
  account: 'Account & billing',
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

export async function getAllHelpArticles(): Promise<HelpArticleSummary[]> {
  return client.fetch(
    `*[_type == "helpArticle"] | order(publishedAt desc) {
      _id,
      title,
      "slug": slug.current,
      category,
      excerpt,
      publishedAt
    }`,
    {},
    { next: { revalidate: 60 } }
  )
}

export async function getHelpArticleBySlug(slug: string): Promise<HelpArticle | null> {
  return client.fetch(
    `*[_type == "helpArticle" && slug.current == $slug][0] {
      _id,
      title,
      "slug": slug.current,
      category,
      excerpt,
      body,
      publishedAt
    }`,
    { slug },
    { next: { revalidate: 60 } }
  )
}
