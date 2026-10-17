import { NextRequest, NextResponse } from 'next/server'
export function middleware(request: NextRequest) {
  // Ring POST callbacks authenticate with HMAC in the route, not a household password.
  if (request.nextUrl.pathname === '/api/webhook' && request.method === 'POST') return NextResponse.next()
  const password = process.env.DOORRELAY_APP_PASSWORD
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(request.nextUrl.hostname)
  if (!password) {
    if (process.env.NODE_ENV === 'development' && loopback) return NextResponse.next()
    return new NextResponse('Set DOORRELAY_APP_PASSWORD on the server before sharing DoorRelay.', { status: 503 })
  }
  const authorization = request.headers.get('authorization')
  if (authorization === 'Basic ' + btoa('household:' + password)) return NextResponse.next()
  return new NextResponse('Enter the household demo credentials to continue.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="DoorRelay household", charset="UTF-8"', 'Cache-Control': 'no-store' } })
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
