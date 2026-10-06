import { useEffect, useRef, useState } from 'react'

// Counts down while the user does nothing. Any touch/click/key resets it.
// Returns the seconds left. Calls onTimeout() at zero.
export default function useInactivityTimeout(seconds, onTimeout, resetKey) {
  const [left, setLeft] = useState(seconds)
  const lastActivity = useRef(Date.now())
  const callback = useRef(onTimeout)

  useEffect(() => {
    callback.current = onTimeout
  })

  useEffect(() => {
    lastActivity.current = Date.now()
    setLeft(seconds)

    const reset = () => {
      lastActivity.current = Date.now()
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))

    const timer = setInterval(() => {
      const remaining = seconds - Math.floor((Date.now() - lastActivity.current) / 1000)
      setLeft(Math.max(remaining, 0))
      if (remaining <= 0) {
        clearInterval(timer)
        callback.current()
      }
    }, 1000)

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset))
      clearInterval(timer)
    }
  }, [seconds, resetKey])

  return left
}
