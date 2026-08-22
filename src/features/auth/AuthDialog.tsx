import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/shared/GoogleIcon'
import { useAuth } from './useAuth'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { isConfigured } = useAuth()
  const [view, setView] = useState<'auth' | 'reset'>('auth')

  // Reset back to the normal sign-in/sign-up view on close, so reopening
  // the dialog later never silently lands on the password-reset screen
  // from a previous visit.
  function handleOpenChange(next: boolean) {
    if (!next) setView('auth')
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {view === 'reset' ? (
          <ResetPasswordForm onBack={() => setView('auth')} />
        ) : (
          <>
            <DialogTitle>Sign in to Outbid</DialogTitle>
            <DialogDescription>Vote, save companies, and manage advertiser accounts.</DialogDescription>

            {!isConfigured ? (
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-fg-muted">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <p>
                  Outbid isn't connected to Supabase yet. Accounts will work once{' '}
                  <code className="rounded bg-surface-raised px-1 py-0.5 text-xs">VITE_SUPABASE_URL</code> and{' '}
                  <code className="rounded bg-surface-raised px-1 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code> are
                  set — see <code className="rounded bg-surface-raised px-1 py-0.5 text-xs">.env.example</code>.
                </p>
              </div>
            ) : (
              <Tabs defaultValue="signin" className="mt-5">
                <TabsList className="w-full">
                  <TabsTrigger value="signin" className="flex-1">
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="flex-1">
                    Sign up
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="mt-4">
                  <AuthForm mode="signin" onSuccess={() => handleOpenChange(false)} onForgotPassword={() => setView('reset')} />
                </TabsContent>
                <TabsContent value="signup" className="mt-4">
                  <AuthForm mode="signup" onSuccess={() => handleOpenChange(false)} />
                </TabsContent>
              </Tabs>
            )}

            {isConfigured && (
              <>
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs uppercase tracking-wide text-fg-subtle">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <GoogleSignInButton />
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={submitting}
      className="w-full"
      onClick={async () => {
        setSubmitting(true)
        try {
          // On success this navigates the whole browser away to Google —
          // there's no "then" state to show, the tab is simply gone.
          await signInWithGoogle()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Couldn’t start Google sign-in.')
          setSubmitting(false)
        }
      }}
    >
      <GoogleIcon className="h-4 w-4" />
      {submitting ? 'Redirecting to Google…' : 'Continue with Google'}
    </Button>
  )
}

function AuthForm({
  mode,
  onSuccess,
  onForgotPassword,
}: {
  mode: 'signin' | 'signup'
  onSuccess: () => void
  onForgotPassword?: () => void
}) {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password, displayName.trim())
        toast.success('Account created — check your email to confirm, if required.')
      } else {
        await signIn(email, password)
        toast.success('Signed in.')
      }
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {mode === 'signup' && (
        <div>
          <Input
            required
            minLength={2}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            autoComplete="name"
          />
          <p className="mt-1 text-xs text-fg-subtle">Shown publicly on any reviews you write — use a nickname if you prefer.</p>
        </div>
      )}
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
      />
      <Input
        type="password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
      />
      {mode === 'signin' && onForgotPassword && (
        <button
          type="button"
          onClick={onForgotPassword}
          className="self-end text-xs text-fg-muted hover:text-fg hover:underline"
        >
          Forgot password?
        </button>
      )}
      <Button type="submit" disabled={submitting} className="mt-1">
        {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
      </Button>
    </form>
  )
}

function ResetPasswordForm({ onBack }: { onBack: () => void }) {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send a reset link.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <DialogTitle>Reset your password</DialogTitle>
      <DialogDescription>
        {sent
          ? "We've sent a password reset link to your email, if an account exists for it."
          : "Enter your email and we'll send you a link to reset your password."}
      </DialogDescription>

      {sent ? (
        <Button type="button" variant="secondary" onClick={onBack} className="mt-5 w-full">
          Back to sign in
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </Button>
          <button type="button" onClick={onBack} className="self-center text-xs text-fg-muted hover:text-fg hover:underline">
            Back to sign in
          </button>
        </form>
      )}
    </>
  )
}
