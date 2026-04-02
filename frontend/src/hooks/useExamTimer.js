/**
 * useExamTimer.js
 *
 * Manages the exam countdown timer.
 *
 * Two-layer timer strategy:
 *   Layer 1 — Local setInterval: ticks every second for smooth UI countdown.
 *             Fast, no network, feels responsive.
 *   Layer 2 — Server sync every 30 seconds: calls GET /sessions/:id/timer
 *             and corrects the local timer with the server's authoritative value.
 *             Prevents drift if the browser tab was backgrounded or throttled.
 *
 * Why not just use the server for every tick?
 *   A network request every second = 3600 requests for a 1-hour exam.
 *   Way too much. Local tick + 30s sync = 120 requests. Much better.
 *
 * onExpire callback:
 *   When remainingSeconds hits 0, the parent (ExamRoom) auto-submits the exam.
 */
import { useEffect, useRef, useCallback } from 'react'
import { syncTimer } from '../api/session.api'
import { useExam } from '../context/exam.context.jsx'

const useExamTimer = (sessionId, onExpire) => {
  const { remainingSeconds, setRemainingSeconds, submitted } = useExam()
  const tickRef  = useRef(null)  // holds the setInterval ID
  const syncRef  = useRef(null)  // holds the sync setInterval ID

  const clearTimers = useCallback(() => {
    if (tickRef.current)  clearInterval(tickRef.current)
    if (syncRef.current)  clearInterval(syncRef.current)
  }, [])

  useEffect(() => {
    if (!sessionId || submitted) return

    // Layer 1: tick every second
    tickRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearTimers()
          onExpire?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Layer 2: sync with server every 30 seconds
    syncRef.current = setInterval(async () => {
      try {
        const res = await syncTimer(sessionId)
        const { remainingSeconds: serverSeconds, status } = res.data.data

        if (status === 'auto_submitted') {
          clearTimers()
          onExpire?.()
          return
        }

        // Correct local timer with server value
        // Only update if difference > 5 seconds to avoid jumpy UI
        setRemainingSeconds(prev => {
          if (Math.abs(prev - serverSeconds) > 5) return serverSeconds
          return prev
        })
      } catch {
        // Sync failed — local timer keeps running
        // Not critical; the server will auto-submit when time expires anyway
      }
    }, 30000)

    return clearTimers // cleanup when component unmounts
  }, [sessionId, submitted])

  // Format seconds into MM:SS string for display
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return { formattedTime: formatTime(remainingSeconds), remainingSeconds }
}

export default useExamTimer