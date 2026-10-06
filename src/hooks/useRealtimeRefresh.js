import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Calls onChange() whenever any row in the given tables is inserted/updated/deleted.
export default function useRealtimeRefresh(tables, onChange) {
  const callback = useRef(onChange)
  useEffect(() => {
    callback.current = onChange
  })

  const key = tables.join(',')

  useEffect(() => {
    const name = `rt-${key}-${Math.random().toString(36).slice(2)}`
    let channel = supabase.channel(name)
    key.split(',').forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => callback.current()
      )
    })
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [key])
}
