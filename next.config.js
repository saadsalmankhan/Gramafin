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
  },
}
module.exports = nextConfig
