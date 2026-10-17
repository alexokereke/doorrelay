import { NextResponse } from 'next/server'
import { getAuthMode } from '@/lib/auth'
// Credentials are used only by server-side Ring API routes.
export async function GET() {
  return NextResponse.json({ configured: getAuthMode() !== null, mode: getAuthMode() }, { headers: { 'Cache-Control': 'no-store' } })
}
