import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
const base = process.env.DOORRELAY_TEST_URL || 'http://127.0.0.1:3000'
const password = process.env.DOORRELAY_APP_PASSWORD
const headers = { 'Content-Type': 'application/json', ...(password ? { Authorization: 'Basic ' + Buffer.from('household:' + password).toString('base64') } : {}) }
async function api(path, data) {
  const response = await fetch(base + path, { headers, ...(data ? { method: 'POST', body: JSON.stringify(data) } : {}) })
  return { status: response.status, data: await response.json() }
}
const visit = await api('/api/webhook/test?type=button_press', {})
assert.equal(visit.status, 200, 'Enable test controls for verification')
const event_id = visit.data.event_id
assert.equal((await api('/api/ring/events')).data.events.some(e => e.event_id === event_id && e.metadata.simulated), true)
const respond = (action, actor, role) => api('/api/doorrelay/responses', { event_id, action, actor, role })
assert.equal((await respond('helper_accepted', 'Helper', 'helper')).status, 409)
assert.equal((await respond('help_requested', 'Resident', 'resident')).status, 200)
assert.equal((await respond('helper_accepted', 'Resident', 'resident')).status, 403)
assert.equal((await respond('helper_accepted', 'Helper', 'helper')).status, 200)
assert.equal((await respond('helper_accepted', 'Other helper', 'helper')).status, 409)
assert.equal((await respond('resolved', 'Helper', 'helper')).status, 200)
assert.equal((await respond('answering', 'Resident', 'resident')).status, 409)
assert.equal((await api('/api/doorrelay/responses')).data.responses[event_id].status, 'resolved')
if (process.env.RING_HMAC_SIGNING_KEY) {
  const raw = JSON.stringify({ meta: { version: '1.1', time: new Date().toISOString(), request_id: 'fixture-' + Date.now() }, data: { id: 'signed-fixture-' + Date.now(), type: 'button_press', attributes: { source: 'fixture-device', source_type: 'devices', timestamp: Date.now() } } })
  const signature = 'sha256=' + createHmac('sha256', process.env.RING_HMAC_SIGNING_KEY).update(raw).digest('hex')
  const send = (body, sig) => fetch(base + '/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': sig }, body })
  assert.equal((await send(raw + ' ', signature)).status, 401)
  const first = await send(raw, signature)
  assert.equal(first.status, 200)
  assert.equal((await first.json()).status, 'processed')
  assert.equal((await (await send(raw, signature)).json()).status, 'already_processed')
  console.log('Signature fixture accepted; tampering and duplicate delivery rejected. This fixture is not a Ring-originated event.')
}
console.log('Shared visit handoff checks passed. Created test event:', event_id)
