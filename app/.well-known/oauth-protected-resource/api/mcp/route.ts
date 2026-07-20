import { NextResponse } from 'next/server'
import { metadataCorsOptionsRequestHandler } from 'mcp-handler'
import { protectedResourceMetadata } from '@/lib/mcp/protectedResourceMetadata'

// RFC 9728's well-known URI construction: for a protected resource that
// isn't at the domain root (ours is /api/mcp), clients may look for
// metadata at /.well-known/oauth-protected-resource/<resource-path> rather
// than (or in addition to) the bare /.well-known/oauth-protected-resource.
// Claude itself doesn't need this — it follows the resource_metadata hint
// in the 401 WWW-Authenticate header from /api/mcp directly — but this
// covers any client that constructs the well-known URL itself instead.
// Same metadata as the bare path; duplicated route only because Next.js
// file-based routing needs a real file at this exact path.
export function GET() {
  return NextResponse.json(protectedResourceMetadata)
}
export const OPTIONS = metadataCorsOptionsRequestHandler()
