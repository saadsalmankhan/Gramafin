import { client } from './client'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import { HELP_CATEGORIES } from '@/lib/helpCategories'

export interface HelpArticleImage {
  asset: SanityImageSource
  alt: string
  attribution?: {
    author?: string
    sourceUrl?: string
    license?: string
  }
}

export interface HelpArticleSummary {
  _id: string
  title: string
  slug: string
  category: string
  excerpt: string
  publishedAt: string
  mainImage?: HelpArticleImage
}

export interface HelpArticle extends HelpArticleSummary {
  body: unknown
}

export function categoryLabel(category: string): string {
  return HELP_CATEGORIES.find(c => c.id === category)?.label ?? category
}

const IMAGE_PROJECTION = `mainImage{
  asset,
  alt,
  attribution
}`

export async function getAllHelpArticles(): Promise<HelpArticleSummary[]> {
  return client.fetch(
    `*[_type == "helpArticle"] | order(publishedAt desc) {
      _id,
      title,
      "slug": slug.current,
      category,
      excerpt,
      publishedAt,
      ${IMAGE_PROJECTION}
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
      publishedAt,
      ${IMAGE_PROJECTION}
    }`,
    { slug },
    { next: { revalidate: 60 } }
  )
}
