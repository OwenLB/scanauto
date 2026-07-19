import { useState, useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''

// Pings /api/health/ on mount, retries every 4s until server responds.
// Returns: 'checking' | 'starting' | 'ready'
export default function useServerStatus() {
  const [status, setStatus] = useState('checking')
  const cancelledRef = useRef(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    cancelledRef.current = false

    const ping = async () => {
      try {
        const controller = new AbortController()
        const t = setTimeout(() => controller.abort(), 5000)
        const res = await fetch(`${API_URL}/api/health/`, { signal: controller.signal })
        clearTimeout(t)
        if (!cancelledRef.current) {
          if (res.ok) {
            setStatus('ready')
          } else {
            setStatus('starting')
            timeoutRef.current = setTimeout(ping, 4000)
          }
        }
      } catch {
        if (!cancelledRef.current) {
          setStatus('starting')
          timeoutRef.current = setTimeout(ping, 4000)
        }
      }
    }

    ping()

    return () => {
      cancelledRef.current = true
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return status
}
