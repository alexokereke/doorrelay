'use client'

import { useState, useEffect, useRef } from 'react'
import { DetectionEvent } from '../components/EventCard'

interface UseEventStreamOptions {
  paused?: boolean
  maxEvents?: number
}

interface UseEventStreamReturn {
  events: DetectionEvent[]
  connected: boolean
}

/**
 * Manages SSE connection for webhook events with auto-reconnect.
 * Also polls the local webhook event store as fallback.
 */
export function useEventStream({ paused = false, maxEvents = 200 }: UseEventStreamOptions = {}): UseEventStreamReturn {
  const [events, setEvents] = useState<DetectionEvent[]>([])
  const [connected, setConnected] = useState(false)
  const pausedEventsRef = useRef<DetectionEvent[]>([])

  // SSE connection with reconnect logic
  useEffect(() => {
    let es: EventSource
    let retryCount = 0
    const maxRetries = 5
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let closed = false

    const connect = () => {
      es = new EventSource('/api/webhook')

      es.onopen = () => {
        setConnected(true)
        retryCount = 0
      }

      es.onmessage = (msg) => {
        let event: DetectionEvent
        try { event = JSON.parse(msg.data) }
        catch { return }
        if (paused) {
          pausedEventsRef.current.unshift(event)
        } else {
          setEvents((prev) => {
            if (prev.some((e) => e.event_id === event.event_id)) return prev
            return [event, ...prev].slice(0, maxEvents)
          })
        }
      }

      es.onerror = () => {
        setConnected(false)
        es.close()
        if (!closed && retryCount < maxRetries) {
          const delay = Math.min(1000 * 2 ** retryCount, 30000)
          retryTimer = setTimeout(connect, delay)
          retryCount++
        }
      }
    }

    connect()
    return () => { closed = true; if (retryTimer) clearTimeout(retryTimer); es?.close() }
  }, [paused, maxEvents])

  // Poll the local event store as fallback
  useEffect(() => {
    const fetchEvents = async () => {
      if (paused) return
      try {
        const res = await fetch('/api/ring/events')
        if (res.ok) {
          const data = await res.json()
          if (data.events?.length) {
            setEvents((prev) => {
              const existingIds = new Set(prev.map((e) => e.event_id))
              const newEvents = data.events.filter((e: DetectionEvent) => !existingIds.has(e.event_id))
              return [...newEvents, ...prev].slice(0, maxEvents)
            })
          }
        }
      } catch { /* ignore */ }
    }

    fetchEvents()
    const interval = setInterval(fetchEvents, 10000)
    return () => clearInterval(interval)
  }, [paused, maxEvents])

  // Flush paused events when unpaused
  useEffect(() => {
    if (!paused && pausedEventsRef.current.length > 0) {
      setEvents((prev) => [...pausedEventsRef.current, ...prev].slice(0, maxEvents))
      pausedEventsRef.current = []
    }
  }, [paused, maxEvents])

  return { events, connected }
}
