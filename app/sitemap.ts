import type { MetadataRoute } from 'next'
import { getAllHelpArticles } from '@/lib/sanity/queries'

// Legal and marketing pages render on the app host (gramafin.com redirects
// every path except "/" to app.gramafin.com — see middleware.ts), so that's
// the canonical URL search engines should index for everything but the home page.
const APP_URL = 'https://app.gramafin.com'
const MARKETING_URL = 'https://gramafin.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date('2026-07-07')

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${MARKETING_URL}/`, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${APP_URL}/login`, lastModified, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${APP_URL}/signup`, lastModified, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${APP_URL}/help`, lastModified, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${APP_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${APP_URL}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${APP_URL}/legal`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ]

  let articleRoutes: MetadataRoute.Sitemap = []
  try {
    const articles = await getAllHelpArticles()
    articleRoutes = articles.map(a => ({
      url: `${APP_URL}/help/${a.slug}`,
      lastModified: a.publishedAt ? new Date(a.publishedAt) : lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    }))
  } catch {
    // Sanity unreachable at build time — ship the static routes rather than fail the build.
  }

  return [...staticRoutes, ...articleRoutes]
}
