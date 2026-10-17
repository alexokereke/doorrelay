import fs from 'node:fs'
import path from 'node:path'
import type { VisitResponse } from './doorrelay-responses'
import type { NormalizedEvent } from './schemas/webhook'

interface Snapshot { events: NormalizedEvent[]; responses: Record<string, VisitResponse> }
const processState = globalThis as typeof globalThis & { __doorrelaySnapshot?: Snapshot }
export function snapshot(): Snapshot {
  if (!processState.__doorrelaySnapshot) {
    const file = path.join(process.env.DOORRELAY_DATA_DIR || path.join(process.cwd(), '.doorrelay'), 'visits.json')
    let loaded: Snapshot = { events: [], responses: {} }
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (!Array.isArray(data.events) || !data.responses || typeof data.responses !== 'object') throw new Error('Invalid visit storage')
      loaded = data
    }
    processState.__doorrelaySnapshot = loaded
  }
  return processState.__doorrelaySnapshot
}
export function persist() {
  const directory = process.env.DOORRELAY_DATA_DIR || path.join(process.cwd(), '.doorrelay')
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  const file = path.join(directory, 'visits.json')
  const temporary = file + '.tmp'
  fs.writeFileSync(temporary, JSON.stringify(snapshot()), { mode: 0o600 })
  fs.renameSync(temporary, file)
}
