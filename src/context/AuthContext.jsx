import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Is the logged-in Supabase user listed in the admins table?
// (Row Level Security only lets an admin read their own row.)
async function loadAdmin() {
  const { data } = await supabase.from('admins').select('id, name, email').maybeSingle()
  return data || null
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      setAdmin(data.session ? await loadAdmin() : null)
      if (active) setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) setAdmin(null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const found = await loadAdmin()
    if (!found) {
      await supabase.auth.signOut()
      throw new Error('This account is not registered as a library administrator.')
    }
    setAdmin(found)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ session, admin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
