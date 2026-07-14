import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/help', '/privacy', '/terms', '/legal', '/login', '/signup'],
      disallow: [
        '/dashboard',
        '/income',
        '/expenses',
        '/budget',
        '/assets',
        '/settings',
        '/studio',
        '/api',
        '/verify',
        '/reset-password',
        '/forgot-password',
      ],
    },
    sitemap: 'https://app.gramafin.com/sitemap.xml',
  }
}
