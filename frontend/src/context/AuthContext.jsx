import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || ''

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasApiKey, setHasApiKey] = useState(null) // null = vérification en cours

  const checkApiKey = useCallback(async (token) => {
    if (!token) {
      setHasApiKey(null)
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/user/api-key/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setHasApiKey(data.has_key === true)
    } catch {
      // Ne pas écraser hasApiKey sur erreur réseau — garder la valeur précédente
      // (le backend peut être occupé avec un stream SSE, timeout, etc.)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      checkApiKey(session?.access_token ?? null).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      checkApiKey(session?.access_token ?? null)
    })

    return () => subscription.unsubscribe()
  }, [checkApiKey])

  const login = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signup = (email, password) =>
    supabase.auth.signUp({ email, password })

  const logout = () => supabase.auth.signOut()

  const refreshApiKey = useCallback((token) => {
    checkApiKey(token)
  }, [checkApiKey])

  if (loading) return null

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signup, logout, hasApiKey, refreshApiKey }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
