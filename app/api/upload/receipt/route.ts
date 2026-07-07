import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { put, del, get } from '@vercel/blob'
import { authOptions } from '@/lib/auth/options'
import { apiRatelimit } from '@/lib/ratelimit'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

function ownsReceipt(url: string, userId: string) {
  return url.includes(`/receipts/${userId}/`)
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { success } = await apiRatelimit.limit(`receipt-get:${session.user.id}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const url = new URL(req.url).searchParams.get('url')
  if (!url || !ownsReceipt(url, session.user.id)) {
    return NextResponse.json({ error: 'Invalid receipt url' }, { status: 400 })
  }

  try {
    const result = await get(url, { access: 'private' })
    if (!result?.stream) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }
    return new NextResponse(result.stream, {
      headers: { 'Content-Type': result.blob.contentType || 'application/octet-stream' },
    })
  } catch (err) {
    console.error('Failed to fetch receipt:', err)
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { success } = await apiRatelimit.limit(`receipt-post:${session.user.id}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Image is too large (max 5MB)' }, { status: 400 })
  }

  try {
    const blob = await put(`receipts/${session.user.id}/${crypto.randomUUID()}-${file.name}`, file, {
      access: 'private',
    })
    return NextResponse.json({ url: blob.url })
  } catch (err) {
    console.error('Failed to upload receipt:', err)
    return NextResponse.json({ error: 'Failed to upload receipt' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { success } = await apiRatelimit.limit(`receipt-delete:${session.user.id}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const url = body?.url
  if (typeof url !== 'string' || !ownsReceipt(url, session.user.id)) {
    return NextResponse.json({ error: 'Invalid receipt url' }, { status: 400 })
  }

  try {
    await del(url)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to delete receipt:', err)
    return NextResponse.json({ error: 'Failed to delete receipt' }, { status: 500 })
  }
}
