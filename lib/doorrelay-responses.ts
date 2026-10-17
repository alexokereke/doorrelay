import { eventStore } from './sse-broadcast'
import { snapshot, persist } from './storage'

export type ResponseStatus = 'answering' | 'help_requested' | 'helper_accepted' | 'needs_attention' | 'resolved'
export type ResponseAction = 'answering' | 'help_requested' | 'helper_accepted' | 'resolved'
export type HouseholdRole = 'resident' | 'helper'

export interface VisitResponse {
  event_id: string
  revision: number
  status: ResponseStatus
  actor: string
  role: HouseholdRole
  updated_at: string
  help_deadline: string | null
}

const HELP_WINDOW_MS = 45_000
export function getVisitResponses(): Record<string, VisitResponse> {
  const responses = snapshot().responses
  let changed = false
  const knownIds = new Set(eventStore.map((event) => event.event_id))
  for (const id of Object.keys(responses)) if (!knownIds.has(id)) { delete responses[id]; changed = true }
  const now = Date.now()
  for (const [id, response] of Object.entries(responses)) {
    if (response.status === 'help_requested' && response.help_deadline && Date.parse(response.help_deadline) <= now) {
      responses[id] = { ...response, status: 'needs_attention', revision: (response.revision || 0) + 1, updated_at: new Date().toISOString() }; changed = true
    }
  }
  if (changed) persist()
  return { ...responses }
}

export function setVisitResponse(
  eventId: string,
  action: ResponseAction,
  actor: string,
  role: HouseholdRole,
): { response?: VisitResponse; error?: string; status: number } {
  if (!eventStore.some((event) => event.event_id === eventId)) {
    return { error: 'That event is no longer available. Refresh the page.', status: 404 }
  }

  const current = getVisitResponses()[eventId]
  if (current?.status === 'resolved') return { error: 'This visit is already handled.', status: 409 }
  if (action === 'help_requested' && role !== 'resident') return { error: 'Switch to Resident to request a helper.', status: 403 }
  if (action === 'helper_accepted' && role !== 'helper') return { error: 'Switch to Helper to accept.', status: 403 }
  if (action === 'helper_accepted' && current?.status !== 'help_requested' && current?.status !== 'needs_attention') {
    return { error: 'There is no help request to accept.', status: 409 }
  }
  if (action === 'answering' && current && current.status !== 'needs_attention') {
    return { error: `This visit is already marked ${current.status.replace(/_/g, ' ')}.`, status: 409 }
  }
  if (action === 'help_requested' && current && (current.status === 'help_requested' || current.status === 'helper_accepted')) {
    return { error: 'Help is already requested or accepted.', status: 409 }
  }
  if (action === 'resolved' && !current) return { error: 'Choose I’ll answer or Request help first.', status: 409 }

  const now = new Date()
  const response: VisitResponse = {
    event_id: eventId,
    revision: (current?.revision || 0) + 1,
    status: action,
    actor,
    role,
    updated_at: now.toISOString(),
    help_deadline: action === 'help_requested' ? new Date(now.getTime() + HELP_WINDOW_MS).toISOString() : null,
  }
  snapshot().responses[eventId] = response
  persist()
  return { response, status: 200 }
}
