import { snapshot, persist } from './storage'
import type { NormalizedEvent } from './schemas/webhook'
const processState = globalThis as typeof globalThis & { __doorrelaySseClients?: Set<ReadableStreamDefaultController<Uint8Array>> }
export const eventStore = snapshot().events
const clients = processState.__doorrelaySseClients ??= new Set<ReadableStreamDefaultController<Uint8Array>>()
export function broadcastEvent(event: NormalizedEvent) {
  if (eventStore.some(existing => existing.event_id === event.event_id || (event.metadata.request_id && existing.metadata.request_id === event.metadata.request_id))) return false
  eventStore.unshift(event)
  eventStore.splice(200)
  const ids = new Set(eventStore.map(event => event.event_id))
  for (const id of Object.keys(snapshot().responses)) if (!ids.has(id)) delete snapshot().responses[id]
  persist()
  const data = new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
  clients.forEach(controller => { try { controller.enqueue(data) } catch { clients.delete(controller) } })
  return true
}
export function addClient(controller: ReadableStreamDefaultController<Uint8Array>) { clients.add(controller) }
export function removeClient(controller: ReadableStreamDefaultController<Uint8Array>) { clients.delete(controller) }
export function getClients() { return clients }
