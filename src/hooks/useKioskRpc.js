import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/format'
import { useKioskSession } from '../context/KioskSessionContext'

// Loads data for the current student through a kiosk_* database function.
// fn: 'kiosk_my_borrowings' | 'kiosk_my_fines' | 'kiosk_my_activity'
export default function useKioskRpc(fn) {
  const { rfid } = useKioskSession()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!rfid) return
    setError('')
    const { data: result, error: err } = await supabase.rpc(fn, { p_rfid: rfid })
    if (err) setError(friendlyError(err))
    else setData(result)
    setLoading(false)
  }, [fn, rfid])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}
