import { NextRequest, NextResponse } from 'next/server'
import { getVisitResponses, setVisitResponse, type HouseholdRole, type ResponseAction } from '@/lib/doorrelay-responses'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const actions: ResponseAction[] = ['answering', 'help_requested', 'helper_accepted', 'resolved']
const roles: HouseholdRole[] = ['resident', 'helper']

export async function GET() {
  return NextResponse.json({ responses: getVisitResponses() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Expected a response.' }, { status: 400 })
  const data = body as Record<string, unknown>
  if (typeof data.event_id !== 'string' || !data.event_id || data.event_id.length > 200 ||
      typeof data.action !== 'string' || !actions.includes(data.action as ResponseAction) ||
      typeof data.actor !== 'string' || data.actor.trim().length < 1 || data.actor.trim().length > 32 ||
      typeof data.role !== 'string' || !roles.includes(data.role as HouseholdRole)) {
    return NextResponse.json({ error: 'Enter a name and choose a valid action and role.' }, { status: 400 })
  }
  const result = setVisitResponse(data.event_id, data.action as ResponseAction, data.actor.trim(), data.role as HouseholdRole)
  return NextResponse.json(result.response ? { response: result.response } : { error: result.error }, { status: result.status })
}
