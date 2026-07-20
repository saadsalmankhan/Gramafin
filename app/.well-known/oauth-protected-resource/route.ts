import { NextResponse } from 'next/server'
import { metadataCorsOptionsRequestHandler } from 'mcp-handler'
import { protectedResourceMetadata } from '@/lib/mcp/protectedResourceMetadata'

export function GET() {
  return NextResponse.json(protectedResourceMetadata)
}
export const OPTIONS = metadataCorsOptionsRequestHandler()
