import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { subscribeToRfid } from '../lib/rfidService'
import { friendlyError } from '../lib/format'

const KioskSessionContext = createContext(null)

export function KioskSessionProvider({ children }) {
  const [student, setStudent] = useState(null)
  const [rfid, setRfid] = useState(null)
  const [status, setStatus] = useState('idle') // idle | identifying
  const [error, setError] = useState('')

  const navigate = useNavigate()
  const location = useLocation()
  const pathRef = useRef(location.pathname)
  const busyRef = useRef(false)

  useEffect(() => {
    pathRef.current = location.pathname
  }, [location.pathname])

  // A card was tapped: find the student and open the dashboard
  const handleScan = useCallback(
    async (uid) => {
      if (busyRef.current) return
      busyRef.current = true
      setStatus('identifying')
      setError('')
      // always clear the previous student first
      setStudent(null)
      setRfid(null)

      const { data, error: err } = await supabase.rpc('kiosk_identify', { p_rfid: uid })

      if (err) {
        setError(friendlyError(err))
        navigate('/', { replace: true })
      } else if (!data) {
        setError('Student not found. Please contact the library administrator.')
        navigate('/', { replace: true })
      } else {
        setStudent(data)
        setRfid(uid)
        navigate('/student', { replace: true })
      }
      setStatus('idle')
      busyRef.current = false
    },
    [navigate]
  )

  // Listen for cards from the ESP32 (ignored while an admin page is open)
  useEffect(() => {
    return subscribeToRfid((uid) => {
      if (pathRef.current.startsWith('/admin')) return
      handleScan(uid)
    })
  }, [handleScan])

  // Hide the error message after a few seconds
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 7000)
    return () => clearTimeout(t)
  }, [error])

  const endSession = useCallback(() => {
    setStudent(null)
    setRfid(null)
    setError('')
    navigate('/', { replace: true })
  }, [navigate])

  return (
    <KioskSessionContext.Provider
      value={{ student, rfid, status, error, handleScan, endSession }}
    >
      {children}
    </KioskSessionContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKioskSession() {
  const ctx = useContext(KioskSessionContext)
  if (!ctx) throw new Error('useKioskSession must be used inside KioskSessionProvider')
  return ctx
}
