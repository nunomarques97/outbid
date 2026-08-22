import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'

const TIMEOUT_MS = 10_000

/**
 * Landing point for both of Supabase's email-link redirects: the OAuth
 * code exchange (see signInWithGoogle's redirectTo) and the password-reset
 * link (see resetPassword's redirectTo) — both land here with tokens in
 * the URL that supabase-js's detectSessionInUrl picks up automatically.
 *
 * The two cases are told apart by the auth event, not the URL shape: a
 * normal sign-in fires SIGNED_IN (handled via the shared session from
 * useAuth, same as before); a password-reset link instead fires
 * PASSWORD_RECOVERY, which this page listens for directly — it's a
 * one-page concern, not something every consumer of useAuth needs to know
 * about, so it isn't threaded through AuthContext.
 *
 * Two distinct failure modes matter for the OAuth path, not just one:
 * Supabase/Google can redirect back with an explicit ?error= (e.g. the
 * user cancelled consent) — handled immediately below — but the code
 * exchange can also fail *silently* client-side (a stale/reused URL, a
 * network hiccup), or this page can be opened directly with no code at
 * all. Neither of those produces an ?error=, so without a timeout this
 * would spin on "Signing you in…" forever instead of ever showing a
 * user-friendly message.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { session, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)
  const [recoveryMode, setRecoveryMode] = useState(false)

  const oauthError = params.get('error_description') ?? params.get('error')

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (oauthError || recoveryMode) return
    if (!loading && session) {
      navigate('/', { replace: true })
    }
  }, [loading, session, oauthError, recoveryMode, navigate])

  useEffect(() => {
    if (oauthError || session || recoveryMode) return
    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [oauthError, session, recoveryMode])

  if (oauthError) {
    return <CallbackError message={`Google sign-in didn't complete: ${oauthError}`} />
  }

  if (recoveryMode) {
    return <SetNewPasswordForm />
  }

  if (timedOut) {
    return <CallbackError message="This sign-in link has expired or didn't complete. Please try signing in again." />
  }

  return <LoadingState label="Signing you in…" />
}

function SetNewPasswordForm() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Password updated.')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update your password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <h1 className="text-2xl font-bold text-fg">Set a new password</h1>
      <p className="mt-2 text-fg-muted">Choose a new password for your Repcastr account.</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <Input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          autoComplete="new-password"
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </div>
  )
}

function CallbackError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <ErrorState message={message} />
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
        Back to Repcastr
      </Link>
    </div>
  )
}
