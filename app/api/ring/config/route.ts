import { NextResponse } from 'next/server'
import { getAuthMode } from '@/lib/auth'

export async function GET() {
  const mode = getAuthMode()

  if (mode === null && process.env.RING_ACCESS_TOKEN && process.env.RING_REFRESH_TOKEN) {
    return NextResponse.json(
      { error: 'Both RING_ACCESS_TOKEN and RING_REFRESH_TOKEN are set. Please use only one.' },
      { status: 400 }
    )
  }

  if (mode === null) {
    return NextResponse.json(
      { error: 'Ring camera is not connected.', mode: null, testEventsEnabled: process.env.NODE_ENV !== 'production' || process.env.DOORRELAY_ENABLE_TEST_EVENTS === 'true' },
      { status: 400 }
    )
  }

  return NextResponse.json({ mode, testEventsEnabled: process.env.NODE_ENV !== 'production' || process.env.DOORRELAY_ENABLE_TEST_EVENTS === 'true' })
}
