'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useWebRTCStream } from './hooks/useWebRTCStream'
import { useEventStream } from './hooks/useEventStream'
import type { HouseholdRole, ResponseAction, VisitResponse } from '@/lib/doorrelay-responses'

type Activity = { event_id: string; event_type: string; timestamp: string }
type AuthMode = 'access_token' | 'refresh_token'

const labels: Record<string, string> = {
  ding: 'Doorbell pressed',
  button_press: 'Doorbell pressed',
  person_detected: 'Person detected',
  motion_detected: 'Motion detected',
  package_detected: 'Package detected',
  vehicle_detected: 'Vehicle detected',
}
function responseLabel(response: VisitResponse) {
  switch (response.status) {
    case 'answering': return `${response.actor} will answer`
    case 'help_requested': return `${response.actor} requested help`
    case 'helper_accepted': return `${response.actor} accepted the handoff`
    case 'needs_attention': return 'No helper accepted within 45 seconds — needs attention'
    case 'resolved': return `${response.actor} marked this handled`
  }
}
function title(type: string) {
  return labels[type] || type.replace(/_/g, ' ')
}
function time(timestamp: string) {
  const value = new Date(timestamp)
  return Number.isNaN(value.getTime()) ? 'Time unavailable' : value.toLocaleString()
}

export default function Dashboard() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deviceId, setDeviceId] = useState<string | undefined>()
  const [deviceError, setDeviceError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [responses, setResponses] = useState<Record<string, VisitResponse>>({})
  const [preview, setPreview] = useState<Activity | null>(null)
  const [previewResponse, setPreviewResponse] = useState<ResponseAction | null>(null)
  const [role, setRole] = useState<HouseholdRole>('resident')
  const [actor, setActor] = useState('Resident')
  const [responseError, setResponseError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [clock, setClock] = useState(Date.now())
  const [testEnabled, setTestEnabled] = useState(false)
  const [newActivity, setNewActivity] = useState('')
  const initialEvents = useRef(false)
  const previousEvent = useRef<string | undefined>()
  const videoRef = useRef<HTMLVideoElement>(null)

  const { streamActive, streamError, startStream, stopStream } = useWebRTCStream({ videoRef, deviceId })
  const { events, connected } = useEventStream({})

  useEffect(() => {
    const savedRole = sessionStorage.getItem('doorrelay-role')
    if (savedRole === 'resident' || savedRole === 'helper') setRole(savedRole)
    const savedName = sessionStorage.getItem('doorrelay-name')
    if (savedName) setActor(savedName)
  }, [])

  useEffect(() => {
    let active = true
    async function refreshResponses() {
      try {
        const res = await fetch('/api/doorrelay/responses', { cache: 'no-store' })
        if (!res.ok) throw new Error('Shared responses are unavailable.')
        const data = await res.json()
        if (active) {
          setResponses(previous => {
            const merged = { ...previous }
            for (const [id, value] of Object.entries(data.responses || {}) as [string, VisitResponse][]) {
              if (!merged[id] || (value.revision || 0) >= (merged[id].revision || 0)) merged[id] = value
            }
            return merged
          })
          setClock(Date.now())
          setResponseError(previous => previous === 'Shared responses are unavailable. Check the server terminal.' ? null : previous)
        }
      } catch {
        if (active) setResponseError('Shared responses are unavailable. Check the server terminal.')
      }
    }
    void refreshResponses()
    const timer = setInterval(refreshResponses, 2000)
    return () => { active = false; clearInterval(timer) }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function configure() {
      try {
        const res = await fetch('/api/ring/config', { signal: controller.signal })
        const data = await res.json()
        setTestEnabled(!!data.testEventsEnabled)
        if (!res.ok || data.error) throw new Error(data.error || 'Unable to load configuration')
        if (data.mode !== 'access_token' && data.mode !== 'refresh_token') {
          throw new Error('Authentication mode is missing. Check your local configuration.')
        }
        setAuthMode(data.mode)
      } catch (error) {
        if (!controller.signal.aborted) setAuthError(error instanceof Error ? error.message : 'Configuration failed')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void configure()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!authMode) return
    const controller = new AbortController()
    async function discover() {
      try {
        const res = await fetch('/api/ring/devices', { signal: controller.signal })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'Unable to load devices')
        const firstId = data.devices?.[0]?.id
        if (typeof firstId !== 'string' || !firstId) throw new Error('No Ring devices found')
        setDeviceId(firstId)
      } catch (error) {
        if (!controller.signal.aborted) setDeviceError(error instanceof Error ? error.message : 'Device discovery failed')
      }
    }
    void discover()
    return () => controller.abort()
  }, [authMode])

  const orderedEvents = useMemo(() => [...events].sort((a, b) => {
    return (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0)
  }), [events])
  // History can contain older events. Do not announce them as a visitor arriving now.
  const selected = orderedEvents.find(event => event.event_id === selectedId) || orderedEvents[0]
  const activity: Activity | undefined = preview || selected
  const response = !preview && activity ? responses[activity.event_id] : null
  const mergeResponses = (previous: Record<string, VisitResponse>, incoming: Record<string, VisitResponse>) => {
    const merged = { ...previous }
    for (const [id, value] of Object.entries(incoming)) if (!merged[id] || (value.revision || 0) >= (merged[id].revision || 0)) merged[id] = value
    return merged
  }
  const secondsRemaining = response?.status === 'help_requested' && response.help_deadline
    ? Math.max(0, Math.ceil((Date.parse(response.help_deadline) - clock) / 1000)) : null

  async function respond(next: ResponseAction) {
    if (!activity) return
    if (preview) { setPreviewResponse(next); return }
    if (!actor.trim()) { setResponseError('Enter your name before responding.'); return }
    setSending(true)
    setResponseError(null)
    try {
      const res = await fetch('/api/doorrelay/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: activity.event_id, action: next, actor: actor.trim(), role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save the response.')
      setResponses(previous => mergeResponses(previous, { [activity.event_id]: data.response }))
    } catch (error) {
      setResponseError(error instanceof Error ? error.message : 'Could not save the response.')
    } finally {
      setSending(false)
    }
  }
  function showPreview() {
    setPreview({ event_id: 'local-preview', event_type: 'button_press', timestamp: new Date().toISOString() })
    setPreviewResponse(null)
    setResponseError(null)
  }

  useEffect(() => {
    const latest = orderedEvents[0]
    if (!initialEvents.current) {
      if (latest) { previousEvent.current = latest.event_id; initialEvents.current = true }
      return
    }
    if (latest && latest.event_id !== previousEvent.current) {
      previousEvent.current = latest.event_id
      setNewActivity(`${latest.metadata.simulated ? 'Local test: ' : ''}${title(latest.event_type)}. Open latest activity to respond.`)
    }
  }, [orderedEvents])

  async function createDemoVisit() {
    setResponseError(null)
    try {
      const res = await fetch('/api/webhook/test?type=button_press', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create test visit')
      setPreview(null); setSelectedId(null)
    } catch (error) { setResponseError(error instanceof Error ? error.message : 'Could not create test visit') }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-700 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest uppercase text-cyan-200 mb-2">A shared front door</p>
            <h1 className="text-4xl font-bold tracking-tight">DoorRelay<span className="text-cyan-300">.</span></h1>
            <p className="text-slate-300 mt-1">A visible alert. A clear handoff. Someone on their way.</p>
          </div>
          <button onClick={showPreview} className="rounded-xl border border-slate-500 px-4 py-3 font-semibold hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
            Try a preview alert
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <p className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
          Resident and helper dashboards share visit updates while open. Visit history is saved on this server. Keep both dashboards open for the handoff; phone and background notifications are not included.
        </p>

        {newActivity && <div role="status" className="rounded-xl border-2 border-cyan-300 bg-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
          <p>{newActivity}</p><button className="rounded-lg bg-cyan-300 px-4 py-2 font-bold text-slate-950" onClick={() => { setSelectedId(null); setPreview(null); setNewActivity('') }}>Open latest activity</button>
        </div>}
        <div className="grid grid-cols-3 gap-3" aria-label="Visit summary">
          <div className="rounded-xl border border-slate-700 p-4"><p className="text-2xl font-bold">{orderedEvents.filter(e => !responses[e.event_id] || responses[e.event_id].status !== 'resolved').length}</p><p className="text-sm text-slate-300">Open visits</p></div>
          <div className="rounded-xl border border-slate-700 p-4"><p className="text-2xl font-bold">{Object.values(responses).filter(r => r.status === 'help_requested' || r.status === 'needs_attention').length}</p><p className="text-sm text-slate-300">Need a helper</p></div>
          <div className="rounded-xl border border-slate-700 p-4"><p className="text-2xl font-bold">{Object.values(responses).filter(r => r.status === 'resolved').length}</p><p className="text-sm text-slate-300">Handled</p></div>
        </div>
        <section aria-label="Household member" className="rounded-2xl border border-slate-700 bg-slate-900 p-4 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">Your name
            <input aria-label="Your name" maxLength={32} value={actor} onChange={e => { setActor(e.target.value); sessionStorage.setItem('doorrelay-name', e.target.value) }} className="rounded-lg bg-slate-800 border border-slate-500 px-3 py-2 text-white" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">View as
            <select value={role} onChange={e => { const next = e.target.value as HouseholdRole; setRole(next); sessionStorage.setItem('doorrelay-role', next); setActor(next === 'helper' ? 'Helper' : 'Resident'); sessionStorage.setItem('doorrelay-name', next === 'helper' ? 'Helper' : 'Resident') }} className="rounded-lg bg-slate-800 border border-slate-500 px-3 py-2 text-white">
              <option value="resident">Resident</option>
              <option value="helper">Helper</option>
            </select>
          </label>
          <span className="text-sm text-slate-300">Choose a different name and view in each tab.</span>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section aria-labelledby="camera-heading" className="order-2 lg:order-1 rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <h2 id="camera-heading" className="text-xl font-semibold mb-3">Camera view</h2>
            <div className="relative aspect-video rounded-xl bg-black overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted aria-label="Ring camera video" className="w-full h-full object-contain" />
              {!streamActive && <div className="absolute inset-0 flex items-center justify-center p-4">
                <button onClick={startStream} disabled={!deviceId} className="rounded-xl bg-cyan-300 text-slate-950 px-5 py-3 font-bold disabled:bg-slate-700 disabled:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                  {deviceId ? 'Start camera view' : authError || deviceError ? 'Camera needs setup' : loading ? 'Loading…' : 'Finding camera…'}
                </button>
              </div>}
              {streamActive && <button onClick={stopStream} className="absolute top-3 right-3 rounded-lg bg-red-700 px-4 py-2 font-semibold hover:bg-red-600">Stop video</button>}
            </div>
            {(authError || deviceError || streamError) && <p role="status" className="mt-3 text-amber-200">{authError || deviceError || streamError}</p>}
            {(authError || deviceError?.includes('401')) && <p className="mt-2 text-sm text-slate-300">Camera access needs a fresh Ring token in .env.local, then a server restart. Household response controls remain available.</p>}
            <p className="text-sm text-slate-300 mt-3">With a Playground token, this view uses the Ring simulator footage.</p>
          </section>

          <section aria-labelledby="activity-heading" className={`order-1 lg:order-2 rounded-2xl border-2 p-5 ${activity && response?.status !== 'resolved' ? 'border-cyan-300 bg-slate-900' : 'border-slate-700 bg-slate-900'}`}>
            <p className="text-sm font-semibold text-cyan-300 mb-3">{preview ? 'PREVIEW — not a Ring event' : selected?.metadata?.simulated ? 'LOCAL TEST EVENT' : selected?.metadata?.signature_verified ? 'SIGNED RING WEBHOOK' : 'RECORDED ACTIVITY'}</p>
            <h2 id="activity-heading" className="text-3xl font-bold">{activity ? title(activity.event_type) : 'Waiting for Ring activity'}</h2>
            <p className="text-slate-300 mt-3">{activity ? time(activity.timestamp) : 'Received events will appear here. A working video stream does not guarantee event delivery.'}</p>
            {activity && <>
              {!preview && <p className="mt-2 text-sm text-slate-300">This is a recorded event; check its time before responding.</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                {(!response || response.status === 'needs_attention') && <button onClick={() => void respond('answering')} disabled={sending} className="rounded-xl bg-cyan-300 px-5 py-3 text-slate-950 font-bold disabled:opacity-50">I’ll answer</button>}
                {role === 'resident' && (!response || response.status === 'answering' || response.status === 'needs_attention') && <button onClick={() => void respond('help_requested')} disabled={sending} className="rounded-xl border border-slate-400 px-5 py-3 font-bold hover:bg-slate-800 disabled:opacity-50">Request helper</button>}
                {role === 'helper' && (response?.status === 'help_requested' || response?.status === 'needs_attention') && <button onClick={() => void respond('helper_accepted')} disabled={sending} className="rounded-xl bg-cyan-300 px-5 py-3 text-slate-950 font-bold disabled:opacity-50">I can help</button>}
                {(!!response || !!previewResponse) && response?.status !== 'resolved' && <button onClick={() => void respond('resolved')} disabled={sending} className="rounded-xl border border-slate-400 px-5 py-3 font-bold hover:bg-slate-800 disabled:opacity-50">Mark handled</button>}
              </div>
            </>}
            <p role="status" aria-live="polite" aria-atomic="true" className="mt-5 min-h-6 font-medium text-cyan-200">{preview ? previewResponse ? `Preview: ${previewResponse.replace(/_/g, ' ')}` : '' : response ? responseLabel(response) : ''}</p>
            {secondsRemaining !== null && <p className="mt-2 text-amber-200">Helper window: {secondsRemaining} seconds remaining. If unanswered, this visit will show “needs attention.”</p>}
            {responseError && <p role="alert" className="mt-3 text-red-300">{responseError}</p>}
            {preview && <button onClick={() => { setPreview(null); setPreviewResponse(null) }} className="mt-4 underline underline-offset-4 text-slate-200">Close preview and return to Ring activity</button>}
          </section>
        </div>

        <section aria-labelledby="history-heading" className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 id="history-heading" className="text-xl font-semibold">Received event history</h2>
            <span className="text-sm text-slate-300">{orderedEvents.length} events</span>
          </div>
          {orderedEvents.length === 0 ? <p className="text-slate-300">No events received yet. Preview alerts are kept separate from this history.</p> :
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              {orderedEvents.map(event => <li key={event.event_id}>
                <button onClick={() => { setSelectedId(event.event_id); setPreview(null); setPreviewResponse(null) }} aria-pressed={!preview && selected?.event_id === event.event_id} className="w-full text-left rounded-xl border border-slate-600 p-4 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                  <span className="block font-semibold">{title(event.event_type)}</span>
                  <span className="block text-sm text-slate-300 mt-1">{time(event.timestamp)}</span>
                  {responses[event.event_id] && <span className="block text-sm text-cyan-200 mt-2">{responseLabel(responses[event.event_id])}</span>}
                </button>
              </li>)}
            </ul>}
          <details className="mt-5 border-t border-slate-700 pt-4 text-sm text-slate-300">
            <summary className="cursor-pointer">Connection details</summary>
            <p className="mt-3">Authentication: {authMode === 'access_token' ? 'access token' : 'refresh token'}.</p>
            <p className="mt-2">Local event channel: {connected ? 'connected' : 'disconnected'}. This status does not confirm Ring delivery.</p>
            <p className="mt-2">Visit history stores up to 200 received events. Response updates refresh every two seconds. Ring webhook signature verification requires partner credentials and an HTTPS receiver.</p>
          </details>
        </section>
        {testEnabled && <details className="rounded-2xl border border-slate-700 p-5 text-slate-300">
          <summary className="cursor-pointer font-semibold">Demo controls</summary>
          <p className="mt-3 text-sm">Create a clearly labeled local test visit to try the resident/helper workflow. This does not contact Ring.</p>
          <button onClick={() => void createDemoVisit()} className="mt-4 rounded-lg border border-cyan-300 px-4 py-3 font-bold text-cyan-200">Create local test visit</button>
        </details>}
        <footer className="pb-6 text-sm text-slate-400">DoorRelay · Accessibility &amp; household coordination · Built on the Amazon Ring starter</footer>
      </div>
    </main>
  )
}
