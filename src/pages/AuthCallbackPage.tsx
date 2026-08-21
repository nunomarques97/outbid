import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'

const TIMEOUT_MS = 10_000

/**
 * Landing point for Supabase's OAuth redirect (see signInWithGoogle's
 * redirectTo). The actual code exchange happens automatically inside
 * supabase-js the moment this page's JS loads and sees ?code=... in the
 * URL (detectSessionInUrl, on by default) — that fires the same
 * onAuthStateChange subscription AuthProvider already listens to, so this
 * page doesn't do any auth work itself. It only waits for that session to
 * show up here, then leaves.
 *
 * Two distinct failure modes matter here, not just one: Supabase/Google
 * can redirect back with an explicit ?error= (e.g. the user cancelled
 * consent) — handled immediately below — but the code exchange can also
 * fail *silently* client-side (a stale/reused URL, a network hiccup), or
 * this page can be opened directly with no code at all. Neither of those
 * produces an ?error=, so without a timeout this would spin on "Signing
 * you in…" forever instead of ever showing a user-friendly message.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { session, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  const oauthError = params.get('error_description') ?? params.get('error')

  useEffect(() => {
    if (oauthError) return
    if (!loading && session) {
      navigate('/', { replace: true })
    }
  }, [loading, session, oauthError, navigate])

  useEffect(() => {
    if (oauthError || session) return
    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [oauthError, session])

  if (oauthError) {
    return <CallbackError message={`Google sign-in didn't complete: ${oauthError}`} />
  }

  if (timedOut) {
    return <CallbackError message="This sign-in link has expired or didn't complete. Please try signing in again." />
  }

  return <LoadingState label="Signing you in…" />
}

function CallbackError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <ErrorState message={message} />
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
        Back to Outbid
      </Link>
    </div>
  )
}
