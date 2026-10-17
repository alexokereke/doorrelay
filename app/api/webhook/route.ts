import { NextRequest, NextResponse } from 'next/server'
import { broadcastEvent, eventStore, addClient, removeClient } from '@/lib/sse-broadcast'
import { parseRingWebhook } from '@/lib/schemas/webhook'
import { verifyRingSignature } from '@/lib/webhook-security'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  const key = process.env.RING_HMAC_SIGNING_KEY
  if (!key) return NextResponse.json({ error: 'Set RING_HMAC_SIGNING_KEY to enable signed Ring webhooks.' }, { status: 503 })
  const raw = await request.text()
  if (raw.length > 128_000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  if (!verifyRingSignature(raw, request.headers.get('X-Signature'), key)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  let body: unknown
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = parseRingWebhook(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid Ring event envelope' }, { status: 400 })
  const { meta, data } = parsed.data
  const date = new Date(data.attributes.timestamp)
  if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 })
  try {
    const added = broadcastEvent({
      event_id: data.id, event_type: data.type, timestamp: date.toISOString(), device_id: data.attributes.source,
      confidence: data.attributes.confidence ?? null, bounding_box: data.attributes.bounding_box ?? null,
      thumbnail_url: data.attributes.thumbnail_url ?? null,
      metadata: { request_id: meta.request_id, ring_version: meta.version, signature_verified: true }, raw: body,
    })
    return NextResponse.json({ status: added ? 'processed' : 'already_processed', event_id: data.id })
  } catch { return NextResponse.json({ error: 'Could not save event' }, { status: 500 }) }
}
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  let cleanup = () => {}
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      let timer: ReturnType<typeof setInterval>
      cleanup = () => {
        if (closed) return
        closed = true; clearInterval(timer); removeClient(controller)
        request.signal.removeEventListener('abort', cleanup)
        try { controller.close() } catch {}
      }
      addClient(controller)
      controller.enqueue(encoder.encode(': connected\n\n'))
      for (const event of eventStore) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      timer = setInterval(() => { try { controller.enqueue(encoder.encode(': ping\n\n')) } catch { cleanup() } }, 15000)
      request.signal.addEventListener('abort', cleanup, { once: true })
      if (request.signal.aborted) cleanup()
    },
    cancel() { cleanup() },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } })
}
