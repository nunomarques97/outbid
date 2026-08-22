import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { AuthContext, NOT_CONFIGURED_MESSAGE } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, displayName?: string) {
    if (!isSupabaseConfigured) throw new Error(NOT_CONFIGURED_MESSAGE)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: displayName ? { data: { display_name: displayName } } : undefined,
    })
    if (error) throw error
  }

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) throw new Error(NOT_CONFIGURED_MESSAGE)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  /**
   * OAuth is a full-page redirect, not a request/response — this call
   * either throws before ever leaving the page (e.g. network failure,
   * or Supabase rejecting the request outright) or the browser navigates
   * away to Google entirely. It notably does NOT throw for "the Google
   * provider isn't configured in Supabase yet" — that fails server-side
   * after the redirect, as a Supabase-hosted error page, not a promise
   * rejection this try/catch can see. See the auth callback route for the
   * one class of OAuth error that *does* come back to this app (the
   * provider redirecting here with an ?error= param, e.g. the user
   * cancelling consent).
   */
  async function signInWithGoogle() {
    if (!isSupabaseConfigured) throw new Error(NOT_CONFIGURED_MESSAGE)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // window.location.origin so this is correct in local dev, staging,
        // and production without any hardcoded URL — whatever host the app
        // is actually running on right now.
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  async function signOut() {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
  }

  /**
   * Supabase emails a link back to /auth/callback carrying a recovery
   * token; supabase-js's detectSessionInUrl picks it up automatically and
   * fires a PASSWORD_RECOVERY auth event (see AuthCallbackPage, which
   * listens for that event directly rather than through this context —
   * it's a one-page concern, not something every consumer of useAuth needs
   * to know about).
   */
  async function resetPassword(email: string) {
    if (!isSupabaseConfigured) throw new Error(NOT_CONFIGURED_MESSAGE)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
