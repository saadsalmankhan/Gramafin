const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },
  // `ws` (the WebSocket driver behind @neondatabase/serverless's Pool, needed
  // for real interactive Postgres transactions) ships optional native
  // addons (bufferutil/utf-8-validate) that webpack's bundling breaks —
  // manifests as "bufferUtil.mask is not a function" at runtime. Marking it
  // external makes Next.js `require()` it normally in the Node runtime
  // instead, where its native/pure-JS fallback detection works correctly.
  experimental: {
    serverComponentsExternalPackages: ['ws'],
    // instrumentation.ts (Sentry's server/edge init) is opt-in on Next.js
    // 14 — default-on only from 15 onward.
    instrumentationHook: true,
  },
}

// Safe to keep wrapped even before a Sentry account exists: source map
// upload only runs when SENTRY_AUTH_TOKEN/ORG/PROJECT are set (all unset
// today), and the plugin no-ops the rest without a DSN.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  silent: true,
  disableLogger: true,
})
